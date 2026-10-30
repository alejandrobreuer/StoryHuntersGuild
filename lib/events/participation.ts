import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/features";
import { recordAttendance } from "@/lib/qr/attendance";
import type { GrantResult } from "@/lib/quests/rewards";

type Admin = ReturnType<typeof createAdminClient>;

// ─── Event participation, added/removed by hand (Admin › Usuarios) ──────────
// A participation is the (event, user) attendance row plus, when the player
// booked, that booking's `attended` flag. The event's RP reward (event_rewards
// flag) is recorded where it was granted — on the booking, exactly like
// ticking attendance in Reservas, or on the attendance row when there's no
// booking — so removing the participation takes back exactly that amount.

export async function addParticipation(
  admin: Admin, user: { id: string; email: string }, eventId: string,
): Promise<GrantResult> {
  const { data: event } = await admin.from("shg_events").select("id, reward_rp").eq("id", eventId).maybeSingle();
  if (!event) return { ok: false, status: 404, error: "Evento no encontrado." };

  const { data: existing } = await admin
    .from("shg_event_attendance").select("id").eq("event_id", eventId).eq("user_id", user.id).maybeSingle();
  if (existing) return { ok: false, status: 409, error: "Este usuario ya figura como participante de ese evento." };

  await recordAttendance(admin, eventId, user, "admin");

  const flags = await getFeatureFlags();
  const reward = flags.event_rewards ? event.reward_rp : 0;
  if (reward <= 0) return { ok: true };

  const { data: row } = await admin
    .from("shg_event_attendance")
    .select("id, booking:shg_bookings(id, user_id, rp_awarded)")
    .eq("event_id", eventId).eq("user_id", user.id)
    .maybeSingle();
  if (!row) return { ok: true };
  const booking = Array.isArray(row.booking) ? row.booking[0] : row.booking;

  // Only a booking tied to this account carries the reward (Reservas reverses
  // it through booking.user_id); one matched by email alone doesn't.
  if (booking?.user_id === user.id) {
    if (booking.rp_awarded > 0) return { ok: true }; // already rewarded via Reservas
    await admin.from("shg_bookings").update({ rp_awarded: reward }).eq("id", booking.id);
  } else {
    await admin.from("shg_event_attendance").update({ rp_awarded: reward }).eq("id", row.id);
  }
  await admin.rpc("shg_award_user", { p_user_id: user.id, p_xp: 0, p_rp: reward });
  return { ok: true };
}

export async function removeParticipation(admin: Admin, userId: string, eventId: string): Promise<GrantResult> {
  const [{ data: attendance }, { data: ownBookings }] = await Promise.all([
    admin.from("shg_event_attendance").select("id, rp_awarded, booking_id").eq("event_id", eventId).eq("user_id", userId).maybeSingle(),
    admin.from("shg_bookings").select("id, rp_awarded").eq("event_id", eventId).eq("user_id", userId).eq("attended", true),
  ]);
  // Plus the booking the check-in linked by email, if it isn't one of those.
  const bookings = [...(ownBookings ?? [])];
  if (attendance?.booking_id && !bookings.some((b) => b.id === attendance.booking_id)) {
    const { data: linked } = await admin.from("shg_bookings").select("id, rp_awarded").eq("id", attendance.booking_id).maybeSingle();
    if (linked) bookings.push(linked);
  }
  if (!attendance && bookings.length === 0) {
    return { ok: false, status: 404, error: "Este usuario no figura como participante de ese evento." };
  }

  let rpBack = attendance?.rp_awarded ?? 0;
  if (attendance) {
    const { error } = await admin.from("shg_event_attendance").delete().eq("id", attendance.id);
    if (error) return { ok: false, status: 500, error: "No se pudo quitar la participación." };
  }
  for (const b of bookings) {
    await admin.from("shg_bookings").update({ attended: false, rp_awarded: 0 }).eq("id", b.id);
    rpBack += b.rp_awarded;
  }
  if (rpBack > 0) await admin.rpc("shg_award_user", { p_user_id: userId, p_xp: 0, p_rp: -rpBack });
  return { ok: true };
}
