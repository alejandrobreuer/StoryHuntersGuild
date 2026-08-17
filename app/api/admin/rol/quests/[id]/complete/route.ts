import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Applies rewards (coin/standing/supplies) to every participating character
// and to the guild's supplies, then flips the quest to 'completed' — all
// atomically via the shg_rol_complete_quest() RPC (row-locked, race-safe;
// mirrors shg_approve_booking's pattern in 001_shg_init.sql).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: rpcError } = await admin.rpc("shg_rol_complete_quest", {
    p_quest_id: params.id,
    p_admin_id: user.id,
  });

  if (rpcError) {
    return NextResponse.json({ error: "No se pudo completar la misión (¿ya estaba completada?)." }, { status: 422 });
  }
  return NextResponse.json({ data });
}
