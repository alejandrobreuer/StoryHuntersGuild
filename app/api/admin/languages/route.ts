import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { languageSchema } from "@/lib/validation/languages";

export async function GET() {
  const { error } = await requirePermission("games");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin.from("shg_languages").select("*").order("code");
  if (dbErr) return NextResponse.json({ error: "Error al obtener idiomas." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("games");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = languageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("shg_languages")
    .insert(parsed.data)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Ya existe un idioma con ese código o nombre." }, { status: 422 });
    }
    return NextResponse.json({ error: "No se pudo crear el idioma." }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
