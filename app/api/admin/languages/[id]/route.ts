import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { languageSchema } from "@/lib/validation/languages";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("games");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = languageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_languages")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === "23505") {
      return NextResponse.json({ error: "Ya existe un idioma con ese código o nombre." }, { status: 422 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el idioma." }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("games");
  if (error) return error;

  const admin = createAdminClient();
  // A trigger (061_shg_game_languages.sql) strips this id from every
  // shg_games.language_ids, so those games just lose this language.
  const { error: deleteError } = await admin.from("shg_languages").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar el idioma." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
