import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROL_NPC_SELECT } from "@/lib/rol/npcSelect";

// Full NPC roster, with residence/faction names for the filters on /rol/npcs.
export async function GET() {
  const { error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_rol_npc")
    .select(ROL_NPC_SELECT)
    .order("name", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener los NPCs." }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
