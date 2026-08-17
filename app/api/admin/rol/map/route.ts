import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const mapSchema = z.object({ image_url: z.string().url().nullable().optional().or(z.literal("")) });

export async function GET() {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin.from("shg_rol_map").select("*").limit(1).maybeSingle();
  if (dbErr) return NextResponse.json({ error: "Error al obtener el mapa." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = mapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("shg_rol_map").select("id").limit(1).maybeSingle();
  if (!existing) return NextResponse.json({ error: "El mapa no fue inicializado." }, { status: 404 });

  const { data, error: updateError } = await admin
    .from("shg_rol_map")
    .update({ image_url: parsed.data.image_url || null })
    .eq("id", existing.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar el mapa." }, { status: 500 });
  return NextResponse.json({ data });
}
