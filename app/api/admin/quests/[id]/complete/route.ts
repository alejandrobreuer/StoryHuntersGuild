import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questCompleteSchema } from "@/lib/validation/quests";

// ─── POST /api/admin/quests/[id]/complete ───────────────────────────────────
// For individual/party/event quests: one action both logs the completion and
// grants the reward immediately. The unique (quest_id, user_id) constraint on
// shg_quest_rewards is what makes double-completion a clean no-op instead of
// double-awarding XP/RP — so the reward insert happens first, and everything
// else only runs once that succeeds. If eventId is given and the quest has a
// max_completions_per_event > 0, this also caps how many completions can be
// logged for that (quest, event) pair, counting existing rows regardless of
// who logged them.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user: adminUser, error } = await requirePermission("quests");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: quest } = await admin.from("shg_quests").select("*").eq("id", params.id).maybeSingle();
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });

  const { userId, eventId } = parsed.data;

  if (eventId && quest.max_completions_per_event > 0) {
    const { count } = await admin
      .from("shg_quest_completions")
      .select("id", { count: "exact", head: true })
      .eq("quest_id", params.id)
      .eq("event_id", eventId);
    if ((count ?? 0) >= quest.max_completions_per_event) {
      return NextResponse.json({ error: "Esta misión ya alcanzó el límite de veces para este evento." }, { status: 422 });
    }
  }

  const { error: rewardError } = await admin.from("shg_quest_rewards").insert({
    quest_id: params.id,
    user_id: userId,
    awarded_xp: quest.reward_xp,
    awarded_rp: quest.reward_rp,
    awarded_by: adminUser.id,
  });

  if (rewardError) {
    if (rewardError.code === "23505") {
      return NextResponse.json({ error: "Este usuario ya completó esta misión." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo otorgar la recompensa." }, { status: 500 });
  }

  await admin
    .from("shg_quest_completions")
    .insert({ quest_id: params.id, user_id: userId, contribution_amount: 1, event_id: eventId || null, logged_by: adminUser.id });

  await admin.rpc("shg_award_user", { p_user_id: userId, p_xp: quest.reward_xp, p_rp: quest.reward_rp });

  if (quest.badge_id) {
    await admin
      .from("shg_user_badges")
      .upsert({ user_id: userId, badge_id: quest.badge_id }, { onConflict: "user_id,badge_id", ignoreDuplicates: true });
  }

  return NextResponse.json({ ok: true });
}
