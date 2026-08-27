import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { locationSchema } from "@/lib/validation/rol";

export async function GET() {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_rol_location")
    .select("*")
    .order("created_at", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener las ubicaciones." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: map } = await admin.from("shg_rol_map").select("id").limit(1).maybeSingle();
  if (!map) return NextResponse.json({ error: "El mapa no fue inicializado." }, { status: 404 });

  const { data, error: insertError } = await admin
    .from("shg_rol_location")
    .insert({
      ...parsed.data,
      icon_url: parsed.data.icon_url || null,
      icon_source_url: parsed.data.icon_source_url || null,
      map_id: map.id,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear la ubicación." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
