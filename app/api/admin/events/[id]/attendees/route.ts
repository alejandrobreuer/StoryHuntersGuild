import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkDisplayName } from "@/lib/auth/displayName";
import { sendPasswordLink } from "@/lib/auth/passwordLink";
import { sendBookingStatusEmail } from "@/lib/email";
import { formatDateTime } from "@/lib/formatting";

const addAttendeeSchema = z.object({
  email:       z.string().trim().email("Email inválido.").transform((e) => e.toLowerCase()),
  name:        z.string().trim().max(40).optional().transform((n) => n || undefined),
  guest_count: z.coerce.number().int().min(1, "Mínimo 1 persona.").max(20).default(1),
});

// ─── POST /api/admin/events/[id]/attendees ──────────────────────────────────
// Staff add a person to an event by email: { email, name?, guest_count? }.
//
// - No account for that email: one is created with no password (same as
//   057_shg_accounts_from_bookings.sql), and the person is emailed a link to
//   choose one. Until they do, signing in or up with that email sends the
//   link again, and the set-password page also asks for their name if the
//   account has none.
// - The booking is free (cost 0, no receipt) and approved on the spot through
//   shg_approve_booking, which is what enforces the event's capacity under a
//   row lock. Finanzas gets its usual row for it (a $0 one) via the booking
//   sync triggers (051).

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user: adminUser, error } = await requirePermission("bookings");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = addAttendeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }
  const { email, guest_count } = parsed.data;

  const admin = createAdminClient();

  const { data: event } = await admin
    .from("shg_events")
    .select("id, title, starts_at, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  if (event.status === "cancelled") {
    return NextResponse.json({ error: "El evento está cancelado." }, { status: 422 });
  }

  let { data: account } = await admin
    .from("shg_users")
    .select("id, email, name, phone, password_hash")
    .eq("email", email)
    .maybeSingle();

  // A typed name is only stored on an account that has none yet; it goes
  // through the same rules as a player choosing their own.
  let typedName: string | undefined;
  if (parsed.data.name && !account?.name) {
    const check = await checkDisplayName(admin, parsed.data.name, account?.id);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
    typedName = check.name;
  }

  if (account) {
    const { data: existing } = await admin
      .from("shg_bookings")
      .select("id, status")
      .eq("event_id", event.id)
      .eq("user_id", account.id)
      .in("status", ["pending", "approved"])
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: existing.status === "approved" ? "Esa persona ya está anotada en este evento." : "Esa persona ya tiene una reserva pendiente en este evento: aprobala desde Reservas." },
        { status: 409 },
      );
    }
    if (typedName) {
      await admin.from("shg_users").update({ name: typedName }).eq("id", account.id);
      account = { ...account, name: typedName };
    }
  }

  const accountCreated = !account;
  if (!account) {
    const { data: created, error: createError } = await admin
      .from("shg_users")
      .insert({ email, name: typedName ?? null, password_hash: null })
      .select("id, email, name, phone, password_hash")
      .single();
    if (createError || !created) {
      return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 500 });
    }
    account = created;
  }

  // Fast, friendly capacity check; shg_approve_booking below is the real gate.
  const { data: remainingRow } = await admin
    .from("shg_event_remaining")
    .select("remaining")
    .eq("event_id", event.id)
    .maybeSingle();
  if (remainingRow != null && guest_count > remainingRow.remaining) {
    return NextResponse.json(
      { error: `No hay lugar: quedan ${Math.max(remainingRow.remaining, 0)} lugar(es).`, data: { accountCreated } },
      { status: 422 },
    );
  }

  const { data: booking, error: insertError } = await admin
    .from("shg_bookings")
    .insert({
      event_id:     event.id,
      user_id:      account.id,
      // Bookings need a name; until the person picks one, show the start of the email.
      name:         account.name ?? email.split("@")[0],
      email,
      phone:        account.phone ?? null,
      guest_count,
      cost:         0,
      receipt_path: null,
      admin_note:   `Agregado por ${adminUser.email} desde el panel.`,
    })
    .select("id")
    .single();
  if (insertError || !booking) {
    return NextResponse.json({ error: "No se pudo crear la reserva." }, { status: 500 });
  }

  const { data: approvedData, error: approveError } = await admin.rpc("shg_approve_booking", {
    p_booking_id: booking.id,
    p_admin_id:   adminUser.id,
  });
  if (approveError) {
    // Lost a race for the last seats: drop the half-made booking.
    await admin.from("shg_bookings").delete().eq("id", booking.id);
    const full = /capacity/i.test(approveError.message);
    return NextResponse.json(
      { error: full ? "No hay lugar suficiente en el evento." : "No se pudo confirmar la reserva.", data: { accountCreated } },
      { status: 422 },
    );
  }
  const approved = Array.isArray(approvedData) ? approvedData[0] : approvedData;

  // One email either way: an account without a password gets the invite
  // (which also says their seat is confirmed); everyone else the usual one.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  if (!account.password_hash) {
    await sendPasswordLink(admin, account, baseUrl, "invite", {
      eventTitle: event.title,
      eventDate:  formatDateTime(event.starts_at),
    });
  } else {
    await sendBookingStatusEmail({ email, name: approved?.name ?? account.name ?? email, eventTitle: event.title, status: "approved" });
  }

  return NextResponse.json({ data: { booking: approved, accountCreated } }, { status: 201 });
}
