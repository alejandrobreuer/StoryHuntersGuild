import { createAdminClient } from "@/lib/supabase/admin";
import type { AttendanceSource } from "@/types/database";

type Admin = ReturnType<typeof createAdminClient>;

/** The user's live booking for this event, if any — matched by account or,
 * for bookings made before they signed up, by the booking's email. Approved
 * wins over pending. */
async function findBooking(admin: Admin, eventId: string, user: { id: string; email: string }) {
  const [{ data: byUser }, { data: byEmail }] = await Promise.all([
    admin.from("shg_bookings").select("id, status").eq("event_id", eventId).eq("user_id", user.id)
      .in("status", ["approved", "pending"]),
    admin.from("shg_bookings").select("id, status").eq("event_id", eventId).eq("email", user.email.toLowerCase())
      .in("status", ["approved", "pending"]),
  ]);
  const all = [...(byUser ?? []), ...(byEmail ?? [])];
  return all.find((b) => b.status === "approved") ?? all[0] ?? null;
}

/**
 * Creates the (event, user) attendance row, or keeps the existing one.
 * Links the user's booking when there is one and flips that booking's
 * `attended` flag, so the existing attendance reports pick up QR check-ins
 * without the host ticking anyone off by hand.
 * Returns whether this call created the row.
 */
export async function recordAttendance(
  admin: Admin,
  eventId: string,
  user: { id: string; email: string },
  source: AttendanceSource
): Promise<{ created: boolean }> {
  const { data: existing } = await admin
    .from("shg_event_attendance").select("id, booking_id").eq("event_id", eventId).eq("user_id", user.id).maybeSingle();
  if (existing?.booking_id) return { created: false };

  const booking = await findBooking(admin, eventId, user);

  if (existing) {
    if (booking) {
      await admin.from("shg_event_attendance").update({ booking_id: booking.id }).eq("id", existing.id);
      await admin.from("shg_bookings").update({ attended: true }).eq("id", booking.id);
    }
    return { created: false };
  }

  const { error } = await admin.from("shg_event_attendance").insert({
    event_id: eventId, user_id: user.id, booking_id: booking?.id ?? null, source,
  });
  // 23505: a concurrent scan (double tap) got there first — same outcome.
  if (error && error.code !== "23505") throw error;
  if (booking) await admin.from("shg_bookings").update({ attended: true }).eq("id", booking.id);
  return { created: !error };
}
