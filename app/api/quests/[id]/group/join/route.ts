import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questGroupJoinSchema } from "@/lib/validation/quests";

// ─── POST /api/quests/[id]/group/join ───────────────────────────────────────
// Self-service, Group missions only. groupId: join an existing forming party,
// or null to start a brand new one. Blocks anyone who already earned this
// mission's reward, or who's already in a live (non-terminal) party for it.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questGroupJoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }
  const { eventId, groupId } = parsed.data;

  const admin = createAdminClient();

  const [{ data: quest }, { data: link }, { data: event }] = await Promise.all([
    admin.from("shg_quests").select("id, status, type, max_participants").eq("id", params.id).maybeSingle(),
    admin.from("shg_quest_events").select("quest_id").eq("quest_id", params.id).eq("event_id", eventId).maybeSingle(),
    admin.from("shg_events").select("started_at, ended_at").eq("id", eventId).maybeSingle(),
  ]);

  if (!quest || quest.status !== "active" || quest.type !== "group") {
    return NextResponse.json({ error: "Misión no disponible." }, { status: 404 });
  }
  if (!link) return NextResponse.json({ error: "Esta misión no está asignada a este evento." }, { status: 422 });
  if (!event || !event.started_at || event.ended_at) {
    return NextResponse.json({ error: "Este evento no está en curso." }, { status: 422 });
  }

  const { data: reward } = await admin
    .from("shg_quest_rewards").select("id").eq("quest_id", params.id).eq("user_id", user.id).maybeSingle();
  if (reward) return NextResponse.json({ error: "Ya completaste esta misión." }, { status: 422 });

  const { data: myGroups } = await admin
    .from("shg_quest_group_members")
    .select("group_id, group:shg_quest_groups!inner(id, quest_id, event_id, status)")
    .eq("user_id", user.id);
  const alreadyIn = (myGroups ?? []).find((m) => {
    const g = Array.isArray(m.group) ? m.group[0] : m.group;
    return g?.quest_id === params.id && g?.event_id === eventId && g?.status !== "completed" && g?.status !== "rejected";
  });
  if (alreadyIn) return NextResponse.json({ error: "Ya formás parte de un grupo para esta misión." }, { status: 422 });

  const maxParticipants = quest.max_participants ?? 2;

  if (groupId) {
    const { data: group } = await admin
      .from("shg_quest_groups").select("id, status, quest_id, event_id").eq("id", groupId).maybeSingle();
    if (!group || group.quest_id !== params.id || group.event_id !== eventId || group.status !== "forming") {
      return NextResponse.json({ error: "Este grupo ya no acepta integrantes." }, { status: 422 });
    }
    const { count } = await admin
      .from("shg_quest_group_members").select("user_id", { count: "exact", head: true }).eq("group_id", groupId);
    if ((count ?? 0) >= maxParticipants) {
      return NextResponse.json({ error: "Este grupo ya está completo." }, { status: 422 });
    }
    const { error: joinError } = await admin
      .from("shg_quest_group_members").insert({ group_id: groupId, user_id: user.id });
    if (joinError) return NextResponse.json({ error: "No se pudo unir al grupo." }, { status: 500 });
    return NextResponse.json({ ok: true, groupId });
  }

  const { data: newGroup, error: createError } = await admin
    .from("shg_quest_groups")
    .insert({ quest_id: params.id, event_id: eventId, status: "forming" })
    .select("id")
    .single();
  if (createError || !newGroup) return NextResponse.json({ error: "No se pudo crear el grupo." }, { status: 500 });

  const { error: joinError } = await admin
    .from("shg_quest_group_members").insert({ group_id: newGroup.id, user_id: user.id });
  if (joinError) return NextResponse.json({ error: "No se pudo unir al grupo." }, { status: 500 });

  return NextResponse.json({ ok: true, groupId: newGroup.id });
}
