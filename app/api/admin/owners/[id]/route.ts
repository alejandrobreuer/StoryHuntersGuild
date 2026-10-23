import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { gameOwnerSchema } from "@/lib/validation/gameOwners";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("games");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = gameOwnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_game_owners")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === "23505") {
      return NextResponse.json({ error: "Ese dueño ya existe." }, { status: 422 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el dueño." }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("games");
  if (error) return error;

  const admin = createAdminClient();
  // A trigger (048_shg_game_multiple_owners.sql) strips this id from every
  // shg_games.owner_ids, so those games just lose this owner.
  const { error: deleteError } = await admin.from("shg_game_owners").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar el dueño." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
