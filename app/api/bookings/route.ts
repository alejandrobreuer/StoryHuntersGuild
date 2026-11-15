import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validation/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionUser } from "@/lib/auth/guard";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { formatARS, formatDateTime } from "@/lib/formatting";
import { priceBooking } from "@/lib/bookingPricing";
import { bookingBenefits, checkInviteCode, claimBenefitUses, missingEventRank } from "@/lib/benefits";

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024; // 8MB

// ─── POST /api/bookings ─────────────────────────────────────────────────────
// multipart/form-data: event_id, name, phone?, guest_count, receipt (file,
// unless the total is $0), coupon_code (repeatable — one per ticket; also
// takes invite codes), use_2x1 ("1"), free_tickets (number)
// Requires a signed-in account: the booking is tied to it and always uses
// its email (attendance, missions and XP all hang off the account).
// Cost is ALWAYS recomputed server-side — from the event's price_per_person,
// the codes and the booker's benefits (lib/bookingPricing.ts) — never
// trusts a client-sent cost.

export async function POST(req: NextRequest) {
  const { user: sessionUser, error: authError } = await requireSessionUser();
  if (authError) {
    return NextResponse.json({ error: "Para reservar tenés que iniciar sesión." }, { status: 401 });
  }

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = createBookingSchema.safeParse({
    event_id:    form.get("event_id"),
    name:        form.get("name"),
    phone:       form.get("phone") || undefined,
    guest_count: form.get("guest_count"),
    coupon_codes: form.getAll("coupon_code").filter((v): v is string => typeof v === "string" && v.trim() !== ""),
    use_2x1:      form.get("use_2x1") === "1",
    free_tickets: form.get("free_tickets") || 0,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { event_id, name, phone, guest_count } = parsed.data;
  const email = sessionUser.email;
  // Same code typed twice counts once (codes match case-insensitively).
  const codes = Array.from(new Map(parsed.data.coupon_codes.map((c) => [c.toUpperCase(), c])).keys());

  const { data: event, error: eventErr } = await admin
    .from("shg_events")
    .select("id, title, starts_at, price_per_person, status, started_at, min_rank_id")
    .eq("id", event_id)
    .eq("status", "published")
    .maybeSingle();

  if (eventErr || !event) {
    return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  }
  if (event.started_at) {
    return NextResponse.json({ error: "Las inscripciones para este evento ya cerraron." }, { status: 422 });
  }
  const lockedRank = await missingEventRank(admin, event.min_rank_id, sessionUser.id);
  if (lockedRank) {
    return NextResponse.json({ error: `Este evento es solo para aventureros de rango ${lockedRank.name} o superior.` }, { status: 403 });
  }

  // Soft capacity pre-check — immediate UX feedback only. The authoritative
  // gate is the row-locked shg_approve_booking RPC at approval time.
  const { data: remainingRow } = await admin
    .from("shg_event_remaining")
    .select("remaining")
    .eq("event_id", event_id)
    .maybeSingle();

  if (remainingRow != null && guest_count > remainingRow.remaining) {
    return NextResponse.json({ error: "No hay suficientes lugares disponibles." }, { status: 422 });
  }

  // Checked (but not yet consumed — that's an atomic update right before the
  // booking insert below, to keep the race window as small as possible) here
  // so an invalid/used code fails fast, before making the user upload a
  // receipt for a booking that's about to be rejected anyway. A code that
  // isn't a coupon may be an invite code (shg_invite_codes).
  const coupons: { id: string; code: string; discountPercent: number }[] = [];
  const invites: { id: string; code: string; discountPercent: number }[] = [];
  for (const code of codes) {
    const { data: found } = await admin
      .from("shg_coupons")
      .select("id, discount_percent, used")
      .ilike("code", code)
      .maybeSingle();
    if (found) {
      if (found.used) return NextResponse.json({ error: `El cupón ${code} ya fue utilizado.` }, { status: 422 });
      coupons.push({ id: found.id, code, discountPercent: found.discount_percent });
      continue;
    }
    const invite = await checkInviteCode(admin, code, sessionUser.id);
    if (!invite) return NextResponse.json({ error: `El código ${code} no existe.` }, { status: 422 });
    if (!invite.ok) return NextResponse.json({ error: invite.error }, { status: 422 });
    invites.push({ id: invite.invite.id, code, discountPercent: invite.invite.discount_percent });
  }
  if (invites.length > 1) {
    return NextResponse.json({ error: "Se puede usar una sola invitación por reserva." }, { status: 422 });
  }

  const benefits = await bookingBenefits(admin, sessionUser.id);
  const twoForOneLeft   = benefits.twoForOne.reduce((n, b) => n + b.remaining, 0);
  const freeTicketsLeft = benefits.freeTickets.reduce((n, b) => n + b.remaining, 0);
  if (parsed.data.use_2x1 && twoForOneLeft === 0) {
    return NextResponse.json({ error: "No te quedan 2x1 este mes." }, { status: 422 });
  }
  if (parsed.data.free_tickets > freeTicketsLeft) {
    return NextResponse.json({ error: `Te quedan ${freeTicketsLeft} entradas gratis.` }, { status: 422 });
  }

  const pricing = priceBooking({
    pricePerPerson: Number(event.price_per_person),
    guestCount:     guest_count,
    codes: [
      ...coupons.map((c) => ({ code: c.code, discountPercent: c.discountPercent, source: "coupon" as const })),
      ...invites.map((c) => ({ code: c.code, discountPercent: c.discountPercent, source: "invite" as const })),
    ],
    memberDiscountPercent: benefits.memberDiscountPercent,
    freeTickets:  parsed.data.free_tickets,
    useTwoForOne: parsed.data.use_2x1,
  });
  const { used, unused, cost } = pricing;
  const usedCodes = new Set(used.filter((s) => s.source === "coupon" || s.source === "invite").map((s) => s.code));

  // Nothing to pay, nothing to prove: the receipt is only required for a
  // booking that costs something.
  const receipt = form.get("receipt");
  const hasReceipt = receipt instanceof File && receipt.size > 0;
  if (cost > 0 && !hasReceipt) {
    return NextResponse.json({ error: "Subí el comprobante de transferencia." }, { status: 422 });
  }
  if (hasReceipt && receipt.size > MAX_RECEIPT_BYTES) {
    return NextResponse.json({ error: "El comprobante no puede superar los 8MB." }, { status: 422 });
  }

  let path: string | null = null;
  if (hasReceipt) {
    const ext = receipt.name.split(".").pop() || "jpg";
    path = `${event_id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("shg-receipts")
      .upload(path, receipt, { contentType: receipt.type, upsert: false });
    if (uploadError) {
      return NextResponse.json({ error: "No se pudo subir el comprobante." }, { status: 500 });
    }
  }

  // Atomic claim: the WHERE used = false makes this a no-op for anyone who
  // loses a race on the same code between the check above and here (e.g. two
  // people submitting the same shared code within the same second) — one
  // update affects the row and returns it, the other affects zero rows and
  // gets null back. If any claim (or the booking insert) fails, the ones
  // already claimed are released so they can be used again.
  const claimedIds: string[] = [];
  const claimedInviteIds: string[] = [];
  const releaseClaims = async () => {
    if (claimedIds.length > 0) {
      await admin.from("shg_coupons").update({ used: false, used_at: null }).in("id", claimedIds);
    }
    if (claimedInviteIds.length > 0) {
      await admin.from("shg_invite_codes").update({ used_at: null, used_by_user_id: null, used_by_booking_id: null }).in("id", claimedInviteIds);
    }
  };
  for (const coupon of coupons.filter((c) => usedCodes.has(c.code))) {
    const { data: claimed } = await admin
      .from("shg_coupons")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", coupon.id)
      .eq("used", false)
      .select("id")
      .maybeSingle();
    if (!claimed) {
      await releaseClaims();
      return NextResponse.json({ error: `El cupón ${coupon.code} ya fue utilizado.` }, { status: 422 });
    }
    claimedIds.push(coupon.id);
  }
  for (const invite of invites.filter((c) => usedCodes.has(c.code))) {
    const { data: claimed } = await admin
      .from("shg_invite_codes")
      .update({ used_at: new Date().toISOString(), used_by_user_id: sessionUser.id })
      .eq("id", invite.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) {
      await releaseClaims();
      return NextResponse.json({ error: `La invitación ${invite.code} ya fue utilizada.` }, { status: 422 });
    }
    claimedInviteIds.push(invite.id);
  }

  const { data: booking, error: insertError } = await admin
    .from("shg_bookings")
    .insert({
      event_id, name, email, phone: phone ?? null, guest_count, cost,
      receipt_path: path,
      user_id: sessionUser.id,
      // Snapshot for the admin view: every discount that applied (codes and
      // benefits) — and, with a single coupon and nothing else, its percent.
      coupon_code: used.length > 0 ? used.map((s) => (s.source === "coupon" || s.source === "invite" ? s.code.toUpperCase() : s.label)).join(", ") : null,
      discount_percent: used.length === 1 && used[0].source === "coupon" ? used[0].discountPercent : null,
    })
    .select("id")
    .single();

  if (insertError) {
    await releaseClaims();
    return NextResponse.json({ error: "No se pudo crear la reserva." }, { status: 500 });
  }

  // 2x1 / free tickets: counted against their limits now that there's a
  // booking to hang them on. Losing a race for the last one undoes it all.
  const benefitClaims: [typeof benefits.freeTickets, number][] = [
    [benefits.twoForOne, pricing.twoForOneUsed ? 1 : 0],
    [benefits.freeTickets, pricing.freeTicketsUsed],
  ];
  for (const [options, count] of benefitClaims) {
    if (count === 0) continue;
    const ok = await claimBenefitUses(admin, sessionUser.id, booking.id, options, count);
    if (!ok) {
      await admin.from("shg_bookings").delete().eq("id", booking.id);
      await releaseClaims();
      return NextResponse.json({ error: "Ese beneficio ya no está disponible. Revisá tu reserva y volvé a intentar." }, { status: 422 });
    }
  }

  // Best-effort back-links for the admin view — the codes are already
  // correctly consumed above regardless of whether this succeeds.
  if (claimedIds.length > 0) {
    await admin.from("shg_coupons").update({ used_by_booking_id: booking.id }).in("id", claimedIds);
  }
  if (claimedInviteIds.length > 0) {
    await admin.from("shg_invite_codes").update({ used_by_booking_id: booking.id }).in("id", claimedInviteIds);
  }

  await sendBookingConfirmationEmail({
    email, name,
    eventTitle: event.title,
    eventDate:  formatDateTime(event.starts_at),
    guestCount: guest_count,
    cost:       formatARS(cost),
  });

  return NextResponse.json(
    { data: { id: booking.id, unused_coupons: unused.filter((s) => s.source === "coupon" || s.source === "invite").map((s) => s.code.toUpperCase()) } },
    { status: 201 },
  );
}
