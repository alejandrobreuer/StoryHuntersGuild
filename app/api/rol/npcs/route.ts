import { NextResponse } from "next/server";
import { getAdminUser, requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROL_NPC_SELECT } from "@/lib/rol/npcSelect";

// Full NPC roster, with residence/faction names for the filters on /rol/npcs.
// Players never see hidden=true rows — the DM (an admin holding the "rol"
// permission) sees everything, same convention as /api/rol/map's discovered
// filter.
export async function GET() {
  const { error } = await requireSessionUser();
  if (error) return error;

  const adminUser = await getAdminUser();
  const isRolAdmin = Boolean(adminUser?.permissions.rol);

  const admin = createAdminClient();
  let query = admin.from("shg_rol_npc").select(ROL_NPC_SELECT);
  if (!isRolAdmin) query = query.eq("hidden", false);
  const { data, error: dbErr } = await query.order("name", { ascending: true });

  if (dbErr) {
    console.error("[GET /api/rol/npcs] query failed:", dbErr);
    return NextResponse.json({ error: `Error al obtener los NPCs: ${dbErr.message}` }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [] });
}
