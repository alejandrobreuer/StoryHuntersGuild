import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { attendanceSchema } from "@/lib/validation/bookings";
import { getFeatureFlags } from "@/lib/features";

// ─── POST /api/admin/bookings/[id]/attendance ───────────────────────────────
// Only approved bookings can have attendance recorded — pending/rejected/
// cancelled registrants were never confirmed to begin with.
//
// Marking attendance also awards the event's Rank Point reward (gated by the
// event_rewards flag, and only for signed-in bookings — guests can't accrue
// RP). The exact amount granted is stored on the booking (rp_awarded) so
// un-marking attendance reverses precisely that amount, even if the event's
// reward_rp is edited afterwards. Re-submitting the same attended value is a
// no-op — no double-award from a redundant click.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("bookings");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = attendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("shg_bookings")
    .select("id, event_id, user_id, attended, rp_awarded, status")
    .eq("id", params.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "No se pudo actualizar la asistencia." }, { status: 422 });
  }

  const nextAttended = parsed.data.attended;
  const patch: Record<string, unknown> = { attended: nextAttended };
  const changed = nextAttended !== booking.attended && Boolean(booking.user_id);

  if (changed && nextAttended) {
    const flags = await getFeatureFlags();
    if (flags.event_rewards) {
      const { data: event } = await admin
        .from("shg_events")
        .select("reward_rp")
        .eq("id", booking.event_id)
        .maybeSingle();
      if (event && event.reward_rp > 0) patch.rp_awarded = event.reward_rp;
    }
  } else if (changed && !nextAttended && booking.rp_awarded > 0) {
    patch.rp_awarded = 0;
  }

  const { data, error: updateError } = await admin
    .from("shg_bookings")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (updateError || !data) {
    return NextResponse.json({ error: "No se pudo actualizar la asistencia." }, { status: 422 });
  }

  if (changed) {
    if (nextAttended && typeof patch.rp_awarded === "number" && patch.rp_awarded > 0) {
      await admin.rpc("shg_award_user", { p_user_id: booking.user_id, p_xp: 0, p_rp: patch.rp_awarded });
    } else if (!nextAttended && booking.rp_awarded > 0) {
      await admin.rpc("shg_award_user", { p_user_id: booking.user_id, p_xp: 0, p_rp: -booking.rp_awarded });
    }
  }

  return NextResponse.json({ data });
}
