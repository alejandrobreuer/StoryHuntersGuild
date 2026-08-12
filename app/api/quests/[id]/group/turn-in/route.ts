import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questGroupActionSchema } from "@/lib/validation/quests";

// ─── POST /api/quests/[id]/group/turn-in ────────────────────────────────────
// Any current member can turn in a started party on behalf of everyone. A
// Guild Attendant confirms once (see admin groups/[groupId]/complete) and
// every member gets the reward.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questGroupActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }
  const { groupId } = parsed.data;

  const admin = createAdminClient();

  const { data: group } = await admin
    .from("shg_quest_groups").select("id, quest_id, event_id, status").eq("id", groupId).maybeSingle();
  if (!group || group.quest_id !== params.id) {
    return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("shg_quest_group_members").select("user_id").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "No formás parte de este grupo." }, { status: 403 });

  const { data: event } = await admin
    .from("shg_events").select("started_at, ended_at").eq("id", group.event_id).maybeSingle();
  if (!event || !event.started_at || event.ended_at) {
    return NextResponse.json({ error: "Este evento no está en curso." }, { status: 422 });
  }

  if (group.status !== "started") {
    return NextResponse.json({ error: "Este grupo todavía no empezó, o ya fue entregado." }, { status: 422 });
  }

  const { error: updateError } = await admin
    .from("shg_quest_groups")
    .update({ status: "turned_in", turned_in_at: new Date().toISOString(), turned_in_by: user.id })
    .eq("id", groupId).eq("status", "started");
  if (updateError) return NextResponse.json({ error: "No se pudo entregar la misión." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
