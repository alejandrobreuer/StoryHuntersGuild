import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingStatusEmail } from "@/lib/email";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: rpcError } = await admin.rpc("shg_approve_booking", {
    p_booking_id: params.id,
    p_admin_id:   user.id,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message || "No se pudo aprobar la reserva." }, { status: 422 });
  }

  const booking = Array.isArray(data) ? data[0] : data;
  if (booking) {
    const { data: event } = await admin.from("shg_events").select("title").eq("id", booking.event_id).maybeSingle();
    await sendBookingStatusEmail({ email: booking.email, name: booking.name, eventTitle: event?.title ?? "", status: "approved" });
  }

  return NextResponse.json({ data: booking });
}
