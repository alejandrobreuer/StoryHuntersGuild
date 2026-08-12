import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questActivationSchema } from "@/lib/validation/quests";

// ─── POST /api/quests/[id]/turn-in ──────────────────────────────────────────
// Self-service, for Individual and Event missions only (Group missions turn
// in via /group/turn-in, Guild missions via /guild-turn-in).
//
// Individual: just flags the activation "turned_in" — a Guild Attendant
// still confirms it via /api/admin/quests/[id]/complete.
//
// Event missions have no activate step (assigned to everyone by default) —
// turning in directly creates the "turned_in" record. If this turn-in makes
// the mission hit its required_turn_ins threshold, it's auto-achieved right
// here: every participant who turned in gets rewarded immediately, no admin
// step needed (see the locked-in "auto-closes at threshold" decision).

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questActivationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { eventId } = parsed.data;

  const [{ data: quest }, { data: link }, { data: event }] = await Promise.all([
    admin.from("shg_quests").select("id, status, type, title, reward_xp, reward_rp, badge_id, required_turn_ins").eq("id", params.id).maybeSingle(),
    admin.from("shg_quest_events").select("quest_id, status").eq("quest_id", params.id).eq("event_id", eventId).maybeSingle(),
    admin.from("shg_events").select("id, title, started_at, ended_at").eq("id", eventId).maybeSingle(),
  ]);

  if (!quest || quest.status !== "active") return NextResponse.json({ error: "Misión no disponible." }, { status: 404 });
  if (quest.type !== "individual" && quest.type !== "event") {
    return NextResponse.json({ error: "Esta misión no se entrega de esta forma." }, { status: 400 });
  }
  if (!link) return NextResponse.json({ error: "Esta misión no está asignada a este evento." }, { status: 422 });
  if (!event || !event.started_at || event.ended_at) {
    return NextResponse.json({ error: "Este evento no está en curso." }, { status: 422 });
  }
  if (quest.type === "event" && link.status !== "open") {
    return NextResponse.json({ error: "Esta misión de evento ya está cerrada." }, { status: 422 });
  }

  const { data: reward } = await admin
    .from("shg_quest_rewards").select("id").eq("quest_id", params.id).eq("user_id", user.id).maybeSingle();
  if (reward) return NextResponse.json({ error: "Ya completaste esta misión." }, { status: 422 });

  const { error: upsertError } = await admin
    .from("shg_quest_activations")
    .upsert(
      { quest_id: params.id, event_id: eventId, user_id: user.id, status: "turned_in", turned_in_at: new Date().toISOString() },
      { onConflict: "quest_id,event_id,user_id" }
    );

  if (upsertError) return NextResponse.json({ error: "No se pudo entregar la misión." }, { status: 500 });

  if (quest.type === "event") {
    await maybeAchieveEventMission(admin, {
      questId: params.id,
      eventId,
      title: quest.title,
      eventTitle: event.title,
      rewardXp: quest.reward_xp,
      rewardRp: quest.reward_rp,
      badgeId: quest.badge_id,
      requiredTurnIns: quest.required_turn_ins ?? 0,
    });
  }

  return NextResponse.json({ ok: true });
}

async function maybeAchieveEventMission(
  admin: ReturnType<typeof createAdminClient>,
  opts: {
    questId: string; eventId: string; title: string; eventTitle: string;
    rewardXp: number; rewardRp: number; badgeId: string | null; requiredTurnIns: number;
  }
) {
  const { count } = await admin
    .from("shg_quest_activations")
    .select("id", { count: "exact", head: true })
    .eq("quest_id", opts.questId).eq("event_id", opts.eventId).eq("status", "turned_in");

  if (!count || count < opts.requiredTurnIns) return;

  // Claim the achievement — only proceed if it's still open, so a burst of
  // simultaneous turn-ins can't double-reward everyone.
  const { data: claimed } = await admin
    .from("shg_quest_events")
    .update({ status: "achieved", closed_at: new Date().toISOString() })
    .eq("quest_id", opts.questId).eq("event_id", opts.eventId).eq("status", "open")
    .select("quest_id")
    .maybeSingle();
  if (!claimed) return;

  const { data: participants } = await admin
    .from("shg_quest_activations")
    .select("user_id, user:shg_users(id, email, name)")
    .eq("quest_id", opts.questId).eq("event_id", opts.eventId).eq("status", "turned_in");

  for (const p of participants ?? []) {
    const userRow = Array.isArray(p.user) ? p.user[0] : p.user;
    const { error: rewardError } = await admin.from("shg_quest_rewards").insert({
      quest_id: opts.questId, user_id: p.user_id, awarded_xp: opts.rewardXp, awarded_rp: opts.rewardRp,
    });
    if (rewardError) continue; // already rewarded somehow — skip, don't double-grant

    await admin.rpc("shg_award_user", { p_user_id: p.user_id, p_xp: opts.rewardXp, p_rp: opts.rewardRp });
    if (opts.badgeId) {
      await admin.from("shg_user_badges").upsert(
        { user_id: p.user_id, badge_id: opts.badgeId },
        { onConflict: "user_id,badge_id", ignoreDuplicates: true }
      );
    }
    await admin.from("shg_quest_history").insert({
      quest_id: opts.questId, quest_title: opts.title, quest_type: "event",
      event_id: opts.eventId, event_title: opts.eventTitle,
      user_id: p.user_id, user_label: userRow?.name || userRow?.email || "Aventurero",
      outcome: "completed", awarded_xp: opts.rewardXp, awarded_rp: opts.rewardRp,
    });
  }
}
