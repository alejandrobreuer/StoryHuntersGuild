import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/quests/[id]/completions ─────────────────────────────────
// Powers the admin quest-detail panel: who's contributed (and how much) and
// who's actually been rewarded, each joined with basic user info.

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const [{ data: completions, error: completionsErr }, { data: rewards, error: rewardsErr }] = await Promise.all([
    admin
      .from("shg_quest_completions")
      .select("id, user_id, contribution_amount, created_at, user:shg_users(id, email, name)")
      .eq("quest_id", params.id)
      .order("created_at", { ascending: false }),
    admin
      .from("shg_quest_rewards")
      .select("user_id, awarded_xp, awarded_rp, awarded_at, user:shg_users(id, email, name)")
      .eq("quest_id", params.id)
      .order("awarded_at", { ascending: false }),
  ]);

  if (completionsErr || rewardsErr) {
    return NextResponse.json({ error: "Error al obtener el detalle de la misión." }, { status: 500 });
  }
  return NextResponse.json({ data: { completions, rewards } });
}
