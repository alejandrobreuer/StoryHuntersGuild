import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questApplySchema } from "@/lib/validation/rol";

// POST: apply to an available quest with one of your own characters.
// DELETE: withdraw your own application, while the quest is still available
// (once the DM starts it, applications are locked in either way).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questApplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();

  const { data: quest } = await admin.from("shg_rol_quest").select("status").eq("id", params.id).maybeSingle();
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  if (quest.status !== "available") {
    return NextResponse.json({ error: "Esta misión ya no acepta postulaciones." }, { status: 422 });
  }

  const { data: character } = await admin
    .from("shg_rol_character")
    .select("id, owner_id")
    .eq("id", parsed.data.character_id)
    .maybeSingle();
  if (!character || character.owner_id !== user.id) {
    return NextResponse.json({ error: "Ese personaje no te pertenece." }, { status: 403 });
  }

  const { data, error: insertError } = await admin
    .from("shg_rol_quest_application")
    .insert({ quest_id: params.id, character_id: character.id })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Ya te postulaste a esta misión con ese personaje." }, { status: 422 });
    }
    return NextResponse.json({ error: "No se pudo postular." }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();

  const { data: quest } = await admin.from("shg_rol_quest").select("status").eq("id", params.id).maybeSingle();
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  if (quest.status !== "available") {
    return NextResponse.json({ error: "Esta misión ya fue iniciada." }, { status: 422 });
  }

  const { data: myCharacters } = await admin.from("shg_rol_character").select("id").eq("owner_id", user.id);
  const myCharacterIds = (myCharacters ?? []).map((c) => c.id);
  if (myCharacterIds.length === 0) {
    return NextResponse.json({ error: "No tenés una postulación en esta misión." }, { status: 404 });
  }

  const { error: deleteError } = await admin
    .from("shg_rol_quest_application")
    .delete()
    .eq("quest_id", params.id)
    .in("character_id", myCharacterIds);

  if (deleteError) return NextResponse.json({ error: "No se pudo retirar la postulación." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
