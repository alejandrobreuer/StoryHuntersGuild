import { NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── DELETE /api/admin/events/[id]/qr/groups/[groupId]/members/[userId] ─────
// Takes a player out of a still-open party — for when two tables playing the
// same Group mission scanned into the same party. The removed player can
// scan the card again to land in a fresh one. An emptied party is deleted.

export async function DELETE(_req: Request, { params }: { params: { id: string; groupId: string; userId: string } }) {
  const { error } = await requirePermissionAny(["events", "quests", "turn_ins"]);
  if (error) return error;

  const admin = createAdminClient();
  const { data: group } = await admin
    .from("shg_quest_groups").select("id, event_id, status").eq("id", params.groupId).maybeSingle();
  if (!group || group.event_id !== params.id) return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
  if (group.status !== "forming" && group.status !== "started") {
    return NextResponse.json({ error: "Este grupo ya fue entregado o cerrado." }, { status: 422 });
  }

  const { error: deleteError } = await admin
    .from("shg_quest_group_members").delete().eq("group_id", params.groupId).eq("user_id", params.userId);
  if (deleteError) return NextResponse.json({ error: "No se pudo quitar al integrante." }, { status: 500 });

  const { count } = await admin
    .from("shg_quest_group_members").select("user_id", { count: "exact", head: true }).eq("group_id", params.groupId);
  if (!count) await admin.from("shg_quest_groups").delete().eq("id", params.groupId).in("status", ["forming", "started"]);

  return NextResponse.json({ ok: true });
}
