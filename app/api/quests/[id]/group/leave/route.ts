import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questGroupActionSchema } from "@/lib/validation/quests";

// ─── POST /api/quests/[id]/group/leave ──────────────────────────────────────
// Lets a member back out of a still-forming party (e.g. joined the wrong
// one). Not part of the original spec, but without it a mis-tap has no way
// back — cheap enough to include. If the last member leaves, the empty
// group row is cleaned up.

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
    .from("shg_quest_groups").select("id, quest_id, status").eq("id", groupId).maybeSingle();
  if (!group || group.quest_id !== params.id) {
    return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
  }
  if (group.status !== "forming") {
    return NextResponse.json({ error: "Ya no podés salir de este grupo." }, { status: 422 });
  }

  const { error: deleteError } = await admin
    .from("shg_quest_group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo salir del grupo." }, { status: 500 });

  const { count } = await admin
    .from("shg_quest_group_members").select("user_id", { count: "exact", head: true }).eq("group_id", groupId);
  if (!count) {
    await admin.from("shg_quest_groups").delete().eq("id", groupId).eq("status", "forming");
  }

  return NextResponse.json({ ok: true });
}
