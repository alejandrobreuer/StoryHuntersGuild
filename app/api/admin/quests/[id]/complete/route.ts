import { NextRequest, NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questCompleteSchema } from "@/lib/validation/quests";

// ─── POST /api/admin/quests/[id]/complete ───────────────────────────────────
// Confirms a mission for Individual, Event, or Guild types (Group missions
// use groups/[groupId]/complete instead).
//
// Individual/Guild: one action logs the completion, grants the reward, and
// records history. The (quest_id, user_id) uniqueness on shg_quest_rewards
// — enforced by the shg_quest_rewards_guard trigger — makes a second
// completion a clean 409 for every type except Guild, which is explicitly
// repeatable: each confirm grants a fresh reward and clears the pending
// self-submission so the player can submit again.
//
// Event: approving a turn-in doesn't reward that person immediately — it
// marks their activation "confirmed" (counted toward required_turn_ins) and
// checks whether the mission has now collected enough confirmed turn-ins to
// achieve. Only once it achieves does everyone confirmed get rewarded, in
// one batch — matching "if it's not achieved and closed, no one gets the
// rewards."

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user: adminUser, error } = await requirePermissionAny(["quests", "turn_ins"]);
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
  if (quest.type === "group") {
    return NextResponse.json({ error: "Las misiones de grupo se confirman desde su grupo." }, { status: 400 });
  }

  const { userId, eventId } = parsed.data;

  if (quest.type === "event") {
    return confirmEventTurnIn(admin, adminUser.id, quest, userId, eventId);
  }

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

  const [{ data: userRow }, { data: eventRow }] = await Promise.all([
    admin.from("shg_users").select("name, email").eq("id", userId).maybeSingle(),
    eventId ? admin.from("shg_events").select("title").eq("id", eventId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  await admin.from("shg_quest_history").insert({
    quest_id: params.id, quest_title: quest.title, quest_type: quest.type,
    event_id: eventId || null, event_title: eventRow?.title ?? null,
    user_id: userId, user_label: userRow?.name || userRow?.email || "Aventurero",
    outcome: "completed", awarded_xp: quest.reward_xp, awarded_rp: quest.reward_rp,
  });

  if (quest.type === "guild") {
    // Clear the pending self-submission so the player can turn in again.
    await admin
      .from("shg_quest_activations")
      .delete()
      .eq("quest_id", params.id).is("event_id", null).eq("user_id", userId).eq("status", "turned_in");
  }

  return NextResponse.json({ ok: true });
}

async function confirmEventTurnIn(
  admin: ReturnType<typeof createAdminClient>,
  adminId: string,
  quest: {
    id: string; title: string; reward_xp: number; reward_rp: number; badge_id: string | null;
    required_turn_ins: number | null;
  },
  userId: string,
  eventId: string | null | undefined
) {
  if (!eventId) return NextResponse.json({ error: "Falta el evento." }, { status: 422 });

  const { data: link } = await admin
    .from("shg_quest_events").select("status").eq("quest_id", quest.id).eq("event_id", eventId).maybeSingle();
  if (!link) return NextResponse.json({ error: "Esta misión no está asignada a este evento." }, { status: 422 });
  if (link.status !== "open") return NextResponse.json({ error: "Esta misión de evento ya está cerrada." }, { status: 422 });

  const { data: existing } = await admin
    .from("shg_quest_activations").select("id, status")
    .eq("quest_id", quest.id).eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  if (existing?.status === "confirmed") return NextResponse.json({ ok: true }); // already approved, no-op

  const { error: upsertError } = await admin
    .from("shg_quest_activations")
    .upsert(
      { quest_id: quest.id, event_id: eventId, user_id: userId, status: "confirmed", turned_in_at: new Date().toISOString() },
      { onConflict: "quest_id,event_id,user_id" }
    );
  if (upsertError) return NextResponse.json({ error: "No se pudo aprobar la entrega." }, { status: 500 });

  await admin
    .from("shg_quest_completions")
    .insert({ quest_id: quest.id, user_id: userId, contribution_amount: 1, event_id: eventId, logged_by: adminId });

  const requiredTurnIns = quest.required_turn_ins ?? 0;
  const { count } = await admin
    .from("shg_quest_activations")
    .select("id", { count: "exact", head: true })
    .eq("quest_id", quest.id).eq("event_id", eventId).eq("status", "confirmed");

  if (!count || count < requiredTurnIns) return NextResponse.json({ ok: true });

  // Claim the achievement — only proceed if it's still open, so a burst of
  // simultaneous confirms can't double-reward everyone.
  const { data: claimed } = await admin
    .from("shg_quest_events")
    .update({ status: "achieved", closed_at: new Date().toISOString() })
    .eq("quest_id", quest.id).eq("event_id", eventId).eq("status", "open")
    .select("quest_id")
    .maybeSingle();
  if (!claimed) return NextResponse.json({ ok: true });

  const { data: event } = await admin.from("shg_events").select("title").eq("id", eventId).maybeSingle();
  const { data: participants } = await admin
    .from("shg_quest_activations")
    .select("user_id, user:shg_users(id, email, name)")
    .eq("quest_id", quest.id).eq("event_id", eventId).eq("status", "confirmed");

  for (const p of participants ?? []) {
    const userRow = Array.isArray(p.user) ? p.user[0] : p.user;
    const { error: rewardError } = await admin.from("shg_quest_rewards").insert({
      quest_id: quest.id, user_id: p.user_id, awarded_xp: quest.reward_xp, awarded_rp: quest.reward_rp, awarded_by: adminId,
    });
    if (rewardError) continue; // already rewarded somehow — skip, don't double-grant

    await admin.rpc("shg_award_user", { p_user_id: p.user_id, p_xp: quest.reward_xp, p_rp: quest.reward_rp });
    if (quest.badge_id) {
      await admin.from("shg_user_badges").upsert(
        { user_id: p.user_id, badge_id: quest.badge_id },
        { onConflict: "user_id,badge_id", ignoreDuplicates: true }
      );
    }
    await admin.from("shg_quest_history").insert({
      quest_id: quest.id, quest_title: quest.title, quest_type: "event",
      event_id: eventId, event_title: event?.title ?? null,
      user_id: p.user_id, user_label: userRow?.name || userRow?.email || "Aventurero",
      outcome: "completed", awarded_xp: quest.reward_xp, awarded_rp: quest.reward_rp,
    });
  }

  return NextResponse.json({ ok: true });
}
