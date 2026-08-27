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
    .select(
      "*, residence:shg_rol_location!shg_rol_npc_residence_location_id_fkey(id, name), " +
      "origin:shg_rol_location!shg_rol_npc_origin_location_id_fkey(id, name), " +
      "factions:shg_rol_npc_faction(is_former, faction:shg_rol_faction(id, name, sort_order))"
    )
    .order("name", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener los NPCs." }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
