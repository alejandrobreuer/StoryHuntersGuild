import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questSchema } from "@/lib/validation/rol";

export async function GET() {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_rol_quest")
    .select("*, location:shg_rol_location(id, name), participants:shg_rol_quest_participant(character:shg_rol_character(id, name))")
    .order("created_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: "Error al obtener las misiones." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("shg_rol_quest")
    .insert({ ...parsed.data, location_id: parsed.data.location_id || null })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear la misión." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
