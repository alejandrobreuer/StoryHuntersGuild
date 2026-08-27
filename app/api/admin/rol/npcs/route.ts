import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { npcSchema } from "@/lib/validation/rol";

// shg_rol_npc has two FKs into shg_rol_location (residence vs. origin) — the
// embed must be disambiguated by constraint name, or PostgREST can't tell
// which column each embed should follow.
const SELECT =
  "*, residence:shg_rol_location!shg_rol_npc_residence_location_id_fkey(id, name), " +
  "origin:shg_rol_location!shg_rol_npc_origin_location_id_fkey(id, name), " +
  "factions:shg_rol_npc_faction(is_former, faction:shg_rol_faction(id, name))";

export async function GET() {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_rol_npc")
    .select(SELECT)
    .order("name", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener los NPCs." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = npcSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const { factions, ...npcFields } = parsed.data;
  const admin = createAdminClient();

  const { data: npc, error: insertError } = await admin
    .from("shg_rol_npc")
    .insert({
      ...npcFields,
      residence_location_id: npcFields.residence_location_id || null,
      origin_location_id: npcFields.origin_location_id || null,
      portrait_url: npcFields.portrait_url || null,
      full_body_url: npcFields.full_body_url || null,
    })
    .select("id")
    .single();

  if (insertError || !npc) return NextResponse.json({ error: "No se pudo crear el NPC." }, { status: 500 });

  if (factions.length > 0) {
    const { error: linkError } = await admin
      .from("shg_rol_npc_faction")
      .insert(factions.map((f) => ({ npc_id: npc.id, faction_id: f.faction_id, is_former: f.is_former })));
    if (linkError) return NextResponse.json({ error: "No se pudieron guardar las facciones." }, { status: 500 });
  }

  const { data, error: selectError } = await admin.from("shg_rol_npc").select(SELECT).eq("id", npc.id).single();
  if (selectError) return NextResponse.json({ error: "NPC creado, pero no se pudo recargar." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
