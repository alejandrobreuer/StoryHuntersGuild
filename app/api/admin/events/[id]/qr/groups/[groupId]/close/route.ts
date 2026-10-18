import { NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/admin/events/[id]/qr/groups/[groupId]/close ──────────────────
// The host closes a party formed by scanning a Group mission's card: it's
// turned in on everyone's behalf and lands in the approval queue, where it's
// confirmed (or rejected) through the existing groups/[groupId] endpoints.
// Unlike the player-side start → turn-in flow, there's no 2-member minimum
// here — the host is vouching for the table in person.

export async function POST(_req: Request, { params }: { params: { id: string; groupId: string } }) {
  const { error } = await requirePermissionAny(["events", "quests", "turn_ins"]);
  if (error) return error;

  const admin = createAdminClient();
  const { data: group } = await admin
    .from("shg_quest_groups").select("id, event_id, status").eq("id", params.groupId).maybeSingle();
  if (!group || group.event_id !== params.id) return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
  if (group.status !== "forming" && group.status !== "started") {
    return NextResponse.json({ error: "Este grupo ya fue entregado o cerrado." }, { status: 422 });
  }

  const { count } = await admin
    .from("shg_quest_group_members").select("user_id", { count: "exact", head: true }).eq("group_id", params.groupId);
  if (!count) return NextResponse.json({ error: "Este grupo no tiene integrantes." }, { status: 422 });

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("shg_quest_groups")
    .update({ status: "turned_in", turned_in_at: now })
    .eq("id", params.groupId).in("status", ["forming", "started"])
    .select("id")
    .maybeSingle();
  if (updateError) return NextResponse.json({ error: "No se pudo cerrar el grupo." }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Este grupo ya fue entregado o cerrado." }, { status: 422 });

  // A QR party skips the explicit Start step — backfill it so reports see one.
  await admin.from("shg_quest_groups").update({ started_at: now }).eq("id", params.groupId).is("started_at", null);

  return NextResponse.json({ ok: true });
}
