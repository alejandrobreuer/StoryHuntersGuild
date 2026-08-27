import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { npcSchema } from "@/lib/validation/rol";

const SELECT = "*, residence:shg_rol_location(id, name), faction:shg_rol_faction(id, name)";

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

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("shg_rol_npc")
    .insert({
      ...parsed.data,
      residence_location_id: parsed.data.residence_location_id || null,
      faction_id: parsed.data.faction_id || null,
    })
    .select(SELECT)
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear el NPC." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
