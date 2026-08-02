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
  const { event_id, name, email, phone, guest_count } = parsed.data;

  const { data: event, error: eventErr } = await admin
    .from("shg_events")
    .select("id, title, starts_at, price_per_person, status")
    .eq("id", event_id)
    .eq("status", "published")
    .maybeSingle();

  if (eventErr || !event) {
    return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
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

  const cost = Number(event.price_per_person) * guest_count;

  const ext = receipt.name.split(".").pop() || "jpg";
  const path = `${event_id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("shg-receipts")
    .upload(path, receipt, { contentType: receipt.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "No se pudo subir el comprobante." }, { status: 500 });
  }

  const sessionUser = await getSessionUser();

  const { data: booking, error: insertError } = await admin
    .from("shg_bookings")
    .insert({
      event_id, name, email, phone: phone ?? null, guest_count, cost,
      receipt_path: path,
      user_id: sessionUser?.id ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: "No se pudo crear la reserva." }, { status: 500 });
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
