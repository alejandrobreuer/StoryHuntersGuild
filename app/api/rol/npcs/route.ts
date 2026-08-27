import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Full NPC roster, with residence/faction names for the filters on /rol/npcs.
export async function GET() {
  const { error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_rol_npc")
    .select("*, residence:shg_rol_location(id, name), faction:shg_rol_faction(id, name)")
    .order("name", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener los NPCs." }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
