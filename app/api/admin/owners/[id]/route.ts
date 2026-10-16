import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

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
