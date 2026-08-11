import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { gameSchema } from "@/lib/validation/games";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("games");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = gameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const { image_url, bgg_link, ...fields } = parsed.data;
  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_games")
    .update({ ...fields, image_url: image_url || null, bgg_link: bgg_link || null })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar el juego." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("games");
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_games").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar el juego." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
