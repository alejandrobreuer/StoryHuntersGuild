import { NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/admin/quests/[id]/groups/[groupId]/reject ───────────────────
// Denies a turned-in Group mission party: no rewards, a "failed" history row
// per member, and the group is closed as "rejected" — freeing every member
// to join a fresh forming party for the same mission.

export async function POST(_req: Request, { params }: { params: { id: string; groupId: string } }) {
  const { user: adminUser, error } = await requirePermissionAny(["quests", "turn_ins"]);
  if (error) return error;

  const admin = createAdminClient();

  const [{ data: quest }, { data: group }] = await Promise.all([
    admin.from("shg_quests").select("id, title, type").eq("id", params.id).maybeSingle(),
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
  const { data: event } = await admin.from("shg_events").select("title").eq("id", group.event_id).maybeSingle();
  const labels = rows.map((m) => {
    const u = Array.isArray(m.user) ? m.user[0] : m.user;
    return u?.name || u?.email || "Aventurero";
  });

  for (let i = 0; i < rows.length; i++) {
    await admin.from("shg_quest_history").insert({
      quest_id: params.id, quest_title: quest.title, quest_type: "group",
      event_id: group.event_id, event_title: event?.title ?? null,
      user_id: rows[i].user_id, user_label: labels[i],
      outcome: "failed", group_id: params.groupId,
      other_participants: labels.filter((_, idx) => idx !== i),
      awarded_xp: 0, awarded_rp: 0,
    });
  }

  await admin
    .from("shg_quest_groups")
    .update({ status: "rejected", closed_at: new Date().toISOString(), closed_by: adminUser.id })
    .eq("id", params.groupId);

  return NextResponse.json({ ok: true });
}
