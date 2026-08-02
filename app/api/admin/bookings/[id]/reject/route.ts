import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { rejectBookingSchema } from "@/lib/validation/bookings";
import { sendBookingStatusEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  let body: unknown = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }
  const parsed = rejectBookingSchema.safeParse(body);
  const note = parsed.success ? parsed.data.note ?? null : null;

  const admin = createAdminClient();
  const { data, error: rpcError } = await admin.rpc("shg_reject_booking", {
    p_booking_id: params.id,
    p_admin_id:   user.id,
    p_note:       note,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message || "No se pudo rechazar la reserva." }, { status: 422 });
  }

  const booking = Array.isArray(data) ? data[0] : data;
  if (booking) {
    const { data: event } = await admin.from("shg_events").select("title").eq("id", booking.event_id).maybeSingle();
    await sendBookingStatusEmail({ email: booking.email, name: booking.name, eventTitle: event?.title ?? "", status: "rejected" });
  }

  return NextResponse.json({ data: booking });
}
