import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/admin/quests/[id]/reward-contributors ────────────────────────
// Community quests: the collective-reward moment from the doc ("all
// contributors earn 2 Rank Points") — grants every distinct contributor who
// doesn't already have a reward row their share. Safe to call more than
// once (e.g. after more contributions come in); already-rewarded users are
// skipped via the (quest_id, user_id) uniqueness on shg_quest_rewards.

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user: adminUser, error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data: quest } = await admin.from("shg_quests").select("*").eq("id", params.id).maybeSingle();
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });

  const { data: completions } = await admin
    .from("shg_quest_completions")
    .select("user_id")
    .eq("quest_id", params.id);

  const contributorIds = Array.from(new Set((completions ?? []).map((c) => c.user_id as string)));
  if (contributorIds.length === 0) {
    return NextResponse.json({ error: "Todavía no hay contribuciones para esta misión." }, { status: 422 });
  }

  const { data: alreadyRewarded } = await admin
    .from("shg_quest_rewards")
    .select("user_id")
    .eq("quest_id", params.id);
  const rewardedSet = new Set((alreadyRewarded ?? []).map((r) => r.user_id as string));

  const toReward = contributorIds.filter((id) => !rewardedSet.has(id));

  for (const userId of toReward) {
    const { error: rewardError } = await admin.from("shg_quest_rewards").insert({
      quest_id: params.id,
      user_id: userId,
      awarded_xp: quest.reward_xp,
      awarded_rp: quest.reward_rp,
      awarded_by: adminUser.id,
    });
    if (rewardError) continue; // concurrently rewarded elsewhere — skip

    await admin.rpc("shg_award_user", { p_user_id: userId, p_xp: quest.reward_xp, p_rp: quest.reward_rp });

    if (quest.badge_id) {
      await admin
        .from("shg_user_badges")
        .upsert({ user_id: userId, badge_id: quest.badge_id }, { onConflict: "user_id,badge_id", ignoreDuplicates: true });
    }
  }

  return NextResponse.json({ data: { rewardedCount: toReward.length } });
}
