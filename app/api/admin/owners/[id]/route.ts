import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("games");
  if (error) return error;

  const admin = createAdminClient();
  // shg_games.owner_id has ON DELETE SET NULL, so games owned by this
  // entry are simply unassigned rather than blocking the delete.
  const { error: deleteError } = await admin.from("shg_game_owners").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar el dueño." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
