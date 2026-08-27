import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// DM accepts a turned-in mission: reward_standing lands on every participant
// (guild_points + recomputed rank) and reward_supplies becomes a pool the
// leader can allocate to features — all atomically via
// shg_rol_accept_quest() (row-locked; mirrors the old complete RPC's pattern).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: rpcError } = await admin.rpc("shg_rol_accept_quest", {
    p_quest_id: params.id,
    p_admin_id: user.id,
  });

  if (rpcError) {
    return NextResponse.json({ error: "No se pudo aceptar la misión (¿ya fue aceptada o todavía no fue entregada?)." }, { status: 422 });
  }
  return NextResponse.json({ data });
}
