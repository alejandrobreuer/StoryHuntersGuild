import { NextResponse } from "next/server";
import { getAdminUser, requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Players only ever see discovered=true locations. The DM (an admin holding
// the "rol" permission) sees every location — the UI dims the undiscovered
// ones instead of hiding them.
export async function GET() {
  const { error } = await requireSessionUser();
  if (error) return error;

  const adminUser = await getAdminUser();
  const isRolAdmin = Boolean(adminUser?.permissions.rol);

  const admin = createAdminClient();
  const { data: map } = await admin.from("shg_rol_map").select("*").limit(1).maybeSingle();
  if (!map) return NextResponse.json({ error: "El mapa no fue inicializado." }, { status: 404 });

  let query = admin.from("shg_rol_location").select("*").eq("map_id", map.id);
  if (!isRolAdmin) query = query.eq("discovered", true);
  const { data: locations, error: dbErr } = await query.order("created_at", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener el mapa." }, { status: 500 });
  return NextResponse.json({ data: { map, locations: locations ?? [] } });
}
