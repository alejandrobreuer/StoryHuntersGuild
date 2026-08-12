import { NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/admin/quests/[id]/groups/[groupId]/complete ─────────────────
// Confirms a turned-in Group mission party: every current member gets the
// reward + a history row (with the rest of the roster recorded as
// other_participants), and the group is closed as "completed".

export async function POST(_req: Request, { params }: { params: { id: string; groupId: string } }) {
  const { user: adminUser, error } = await requirePermissionAny(["quests", "turn_ins"]);
  if (error) return error;

  const admin = createAdminClient();

  const [{ data: quest }, { data: group }] = await Promise.all([
    admin.from("shg_quests").select("id, title, type, reward_xp, reward_rp, badge_id").eq("id", params.id).maybeSingle(),
    admin.from("shg_quest_groups").select("id, quest_id, event_id, status").eq("id", params.groupId).maybeSingle(),
  ]);
  if (!quest || quest.type !== "group") return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  if (!group || group.quest_id !== params.id) return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
  if (group.status !== "turned_in") {
    return NextResponse.json({ error: "Este grupo todavía no fue entregado." }, { status: 422 });
  }

  const { data: members } = await admin
    .from("shg_quest_group_members")
    .select("user_id, user:shg_users(id, email, name)")
    .eq("group_id", params.groupId);
  const rows = members ?? [];
  if (rows.length === 0) return NextResponse.json({ error: "Este grupo no tiene integrantes." }, { status: 422 });

  const { data: event } = await admin.from("shg_events").select("title").eq("id", group.event_id).maybeSingle();
  const labels = rows.map((m) => {
    const u = Array.isArray(m.user) ? m.user[0] : m.user;
    return u?.name || u?.email || "Aventurero";
  });

  for (let i = 0; i < rows.length; i++) {
    const m = rows[i];
    const { error: rewardError } = await admin.from("shg_quest_rewards").insert({
      quest_id: params.id, user_id: m.user_id, group_id: params.groupId,
      awarded_xp: quest.reward_xp, awarded_rp: quest.reward_rp, awarded_by: adminUser.id,
    });
    if (rewardError) continue; // already rewarded somehow — skip, don't double-grant

    await admin.rpc("shg_award_user", { p_user_id: m.user_id, p_xp: quest.reward_xp, p_rp: quest.reward_rp });
    if (quest.badge_id) {
      await admin.from("shg_user_badges").upsert(
        { user_id: m.user_id, badge_id: quest.badge_id },
        { onConflict: "user_id,badge_id", ignoreDuplicates: true }
      );
    }
    await admin.from("shg_quest_history").insert({
      quest_id: params.id, quest_title: quest.title, quest_type: "group",
      event_id: group.event_id, event_title: event?.title ?? null,
      user_id: m.user_id, user_label: labels[i],
      outcome: "completed", group_id: params.groupId,
      other_participants: labels.filter((_, idx) => idx !== i),
      awarded_xp: quest.reward_xp, awarded_rp: quest.reward_rp,
    });
  }

  await admin
    .from("shg_quest_groups")
    .update({ status: "completed", closed_at: new Date().toISOString(), closed_by: adminUser.id })
    .eq("id", params.groupId);

  return NextResponse.json({ ok: true });
}
