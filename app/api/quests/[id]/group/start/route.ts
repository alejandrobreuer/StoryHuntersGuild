import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questGroupActionSchema } from "@/lib/validation/quests";

// ─── POST /api/quests/[id]/group/start ──────────────────────────────────────
// Any current member can start a forming party once it has at least 2
// members — it doesn't need to be full. Starting locks the roster: no more
// joins after this.

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

  if (group.status !== "forming") {
    return NextResponse.json({ error: "Este grupo ya está en curso o cerrado." }, { status: 422 });
  }

  const { count } = await admin
    .from("shg_quest_group_members").select("user_id", { count: "exact", head: true }).eq("group_id", groupId);
  if ((count ?? 0) < 2) {
    return NextResponse.json({ error: "El grupo necesita al menos 2 integrantes para empezar." }, { status: 422 });
  }

  const { error: updateError } = await admin
    .from("shg_quest_groups")
    .update({ status: "started", started_at: new Date().toISOString() })
    .eq("id", groupId).eq("status", "forming");
  if (updateError) return NextResponse.json({ error: "No se pudo iniciar el grupo." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
