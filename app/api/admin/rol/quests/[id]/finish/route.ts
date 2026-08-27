import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// DM closes out an accepted mission — any supplies the leader never
// allocated land in the guild's general pool, no gate on allocation
// completeness — then flips the quest to 'completed' (the permanent history
// record, per 019_shg_rol_init.sql's header comment).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: rpcError } = await admin.rpc("shg_rol_finish_quest", {
    p_quest_id: params.id,
    p_admin_id: user.id,
  });

  if (rpcError) {
    return NextResponse.json({ error: "No se pudo finalizar la misión (¿ya estaba finalizada o todavía no fue aceptada?)." }, { status: 422 });
  }
  return NextResponse.json({ data });
}
