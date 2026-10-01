import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validation/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/guard";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { formatARS, formatDateTime } from "@/lib/formatting";

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024; // 8MB

// ─── POST /api/bookings ─────────────────────────────────────────────────────
// multipart/form-data: event_id, name, email, phone?, guest_count, receipt (file)
// Cost is ALWAYS recomputed server-side from the event's price_per_person —
// never trusts a client-sent cost.

export async function POST(req: NextRequest) {
  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = createBookingSchema.safeParse({
    event_id:    form.get("event_id"),
    name:        form.get("name"),
    email:       form.get("email"),
    phone:       form.get("phone") || undefined,
    guest_count: form.get("guest_count"),
    coupon_code: form.get("coupon_code") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const receipt = form.get("receipt");
  if (!(receipt instanceof File) || receipt.size === 0) {
    return NextResponse.json({ error: "Subí el comprobante de transferencia." }, { status: 422 });
  }
  if (receipt.size > MAX_RECEIPT_BYTES) {
    return NextResponse.json({ error: "El comprobante no puede superar los 8MB." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { event_id, name, email, phone, guest_count, coupon_code } = parsed.data;

  const { data: event, error: eventErr } = await admin
    .from("shg_events")
    .select("id, title, starts_at, price_per_person, status, started_at")
    .eq("id", event_id)
    .eq("status", "published")
    .maybeSingle();

  if (eventErr || !event) {
    return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  }
  if (event.started_at) {
    return NextResponse.json({ error: "Las inscripciones para este evento ya cerraron." }, { status: 422 });
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

  const subtotal = Number(event.price_per_person) * guest_count;

  // Checked (but not yet consumed — that's an atomic update right before the
  // booking insert below, to keep the race window as small as possible) here
  // so an invalid/used code fails fast, before making the user upload a
  // receipt for a booking that's about to be rejected anyway.
  let coupon: { id: string; discount_percent: number } | null = null;
  if (coupon_code) {
    const { data: found } = await admin
      .from("shg_coupons")
      .select("id, discount_percent, used")
      .ilike("code", coupon_code)
      .maybeSingle();
    if (!found) return NextResponse.json({ error: "Ese cupón no existe." }, { status: 422 });
    if (found.used) return NextResponse.json({ error: "Ese cupón ya fue utilizado." }, { status: 422 });
    coupon = { id: found.id, discount_percent: found.discount_percent };
  }

  const cost = coupon ? Math.round(subtotal * (1 - coupon.discount_percent / 100)) : subtotal;

  const ext = receipt.name.split(".").pop() || "jpg";
  const path = `${event_id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("shg-receipts")
    .upload(path, receipt, { contentType: receipt.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "No se pudo subir el comprobante." }, { status: 500 });
  }

  // Atomic claim: the WHERE used = false makes this a no-op for anyone who
  // loses a race on the same code between the check above and here (e.g. two
  // people submitting the same shared code within the same second) — one
  // update affects the row and returns it, the other affects zero rows and
  // gets null back.
  if (coupon) {
    const { data: claimed } = await admin
      .from("shg_coupons")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", coupon.id)
      .eq("used", false)
      .select("id")
      .maybeSingle();
    if (!claimed) {
      return NextResponse.json({ error: "Ese cupón ya fue utilizado." }, { status: 422 });
    }
  }

  const sessionUser = await getSessionUser();

  const { data: booking, error: insertError } = await admin
    .from("shg_bookings")
    .insert({
      event_id, name, email, phone: phone ?? null, guest_count, cost,
      receipt_path: path,
      user_id: sessionUser?.id ?? null,
      coupon_code: coupon ? coupon_code!.toUpperCase() : null,
      discount_percent: coupon?.discount_percent ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: "No se pudo crear la reserva." }, { status: 500 });
  }

  // Best-effort back-link for the admin view — the coupon is already
  // correctly consumed above regardless of whether this succeeds.
  if (coupon) {
    await admin.from("shg_coupons").update({ used_by_booking_id: booking.id }).eq("id", coupon.id);
  }

  await sendBookingConfirmationEmail({
    email, name,
    eventTitle: event.title,
    eventDate:  formatDateTime(event.starts_at),
    guestCount: guest_count,
    cost:       formatARS(cost),
  });

  return NextResponse.json({ data: { id: booking.id } }, { status: 201 });
}
