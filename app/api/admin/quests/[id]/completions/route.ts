import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/quests/[id]/completions ─────────────────────────────────
// Powers the admin quest-detail panel: who's contributed (and how much), who's
// actually been rewarded, and who has self-service activated/turned in the
// mission at an event (awaiting confirmation) — each joined with basic
// user/event info.

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("quests");
  if (error) return error;

  const admin = createAdminClient();
  const [
    { data: completions, error: completionsErr },
    { data: rewards, error: rewardsErr },
    { data: activations, error: activationsErr },
  ] = await Promise.all([
    admin
      .from("shg_quest_completions")
      .select("id, user_id, contribution_amount, event_id, created_at, user:shg_users(id, email, name), event:shg_events(id, title)")
      .eq("quest_id", params.id)
      .order("created_at", { ascending: false }),
    admin
      .from("shg_quest_rewards")
      .select("user_id, awarded_xp, awarded_rp, awarded_at, user:shg_users(id, email, name)")
      .eq("quest_id", params.id)
      .order("awarded_at", { ascending: false }),
    admin
      .from("shg_quest_activations")
      .select("event_id, user_id, status, activated_at, turned_in_at, user:shg_users(id, email, name)")
      .eq("quest_id", params.id)
      .order("turned_in_at", { ascending: false }),
  ]);

  if (completionsErr || rewardsErr || activationsErr) {
    return NextResponse.json({ error: "Error al obtener el detalle de la misión." }, { status: 500 });
  }
  return NextResponse.json({ data: { completions, rewards, activations } });
}
