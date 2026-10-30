import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export interface RewardableQuest {
  id: string; title: string; type: string;
  reward_xp: number; reward_rp: number; badge_id: string | null;
  max_completions_per_event: number;
}

export type GrantResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Grants a quest to one player: reward row, completion, XP/RP, badge and a
 * "completed" history entry. The shg_quest_rewards_guard trigger turns a
 * second grant of a non-Guild quest into a 23505 → 409.
 * Used by "confirm" in Misiones and by "add quest" in Usuarios.
 */
export async function grantQuestReward(
  admin: Admin, adminId: string, quest: RewardableQuest, userId: string, eventId: string | null,
): Promise<GrantResult> {
  if (eventId && quest.max_completions_per_event > 0) {
    const { count } = await admin
      .from("shg_quest_completions")
      .select("id", { count: "exact", head: true })
      .eq("quest_id", quest.id)
      .eq("event_id", eventId);
    if ((count ?? 0) >= quest.max_completions_per_event) {
      return { ok: false, status: 422, error: "Esta misión ya alcanzó el límite de veces para este evento." };
    }
  }

  const { error: rewardError } = await admin.from("shg_quest_rewards").insert({
    quest_id: quest.id,
    user_id: userId,
    awarded_xp: quest.reward_xp,
    awarded_rp: quest.reward_rp,
    awarded_by: adminId,
  });

  if (rewardError) {
    if (rewardError.code === "23505") {
      return { ok: false, status: 409, error: "Este usuario ya completó esta misión." };
    }
    return { ok: false, status: 500, error: "No se pudo otorgar la recompensa." };
  }

  await admin
    .from("shg_quest_completions")
    .insert({ quest_id: quest.id, user_id: userId, contribution_amount: 1, event_id: eventId || null, logged_by: adminId });

  await admin.rpc("shg_award_user", { p_user_id: userId, p_xp: quest.reward_xp, p_rp: quest.reward_rp });

  if (quest.badge_id) {
    await admin
      .from("shg_user_badges")
      .upsert({ user_id: userId, badge_id: quest.badge_id }, { onConflict: "user_id,badge_id", ignoreDuplicates: true });
  }

  const [{ data: userRow }, { data: eventRow }] = await Promise.all([
    admin.from("shg_users").select("name, email").eq("id", userId).maybeSingle(),
    eventId ? admin.from("shg_events").select("title").eq("id", eventId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  await admin.from("shg_quest_history").insert({
    quest_id: quest.id, quest_title: quest.title, quest_type: quest.type,
    event_id: eventId || null, event_title: eventRow?.title ?? null,
    user_id: userId, user_label: userRow?.name || userRow?.email || "Aventurero",
    outcome: "completed", awarded_xp: quest.reward_xp, awarded_rp: quest.reward_rp,
  });

  return { ok: true };
}

/**
 * Undoes one reward: takes back exactly the XP/RP it granted, drops its
 * completion and "completed" history entry, and removes the quest's badge
 * unless another quest the player still holds grants the same one.
 */
export async function revokeQuestReward(admin: Admin, userId: string, rewardId: string): Promise<GrantResult> {
  const { data: reward } = await admin
    .from("shg_quest_rewards")
    .select("id, quest_id, awarded_xp, awarded_rp, quest:shg_quests(badge_id)")
    .eq("id", rewardId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!reward) return { ok: false, status: 404, error: "Esa misión no figura como completada." };

  const { error: deleteError } = await admin.from("shg_quest_rewards").delete().eq("id", reward.id);
  if (deleteError) return { ok: false, status: 500, error: "No se pudo quitar la misión." };

  await admin.rpc("shg_award_user", { p_user_id: userId, p_xp: -reward.awarded_xp, p_rp: -reward.awarded_rp });

  // Most recent completion / history entry for this quest (a Guild quest can
  // have several — remove one per reward).
  const { data: completion } = await admin
    .from("shg_quest_completions").select("id")
    .eq("quest_id", reward.quest_id).eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (completion) await admin.from("shg_quest_completions").delete().eq("id", completion.id);

  const { data: history } = await admin
    .from("shg_quest_history").select("id")
    .eq("quest_id", reward.quest_id).eq("user_id", userId).eq("outcome", "completed")
    .order("recorded_at", { ascending: false }).limit(1).maybeSingle();
  if (history) await admin.from("shg_quest_history").delete().eq("id", history.id);

  const quest = Array.isArray(reward.quest) ? reward.quest[0] : reward.quest;
  if (quest?.badge_id) {
    const { data: stillHeld } = await admin
      .from("shg_quest_rewards")
      .select("id, quest:shg_quests!inner(badge_id)")
      .eq("user_id", userId)
      .eq("quest.badge_id", quest.badge_id)
      .limit(1);
    if (!stillHeld?.length) {
      await admin.from("shg_user_badges").delete().eq("user_id", userId).eq("badge_id", quest.badge_id);
    }
  }

  return { ok: true };
}
