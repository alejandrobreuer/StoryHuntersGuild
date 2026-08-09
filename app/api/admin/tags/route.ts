import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { tagSchema } from "@/lib/validation/tags";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin.from("shg_tags").select("*").order("name");
  if (dbErr) return NextResponse.json({ error: "Error al obtener tags." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = tagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("shg_tags")
    .insert(parsed.data)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Ese tag ya existe." }, { status: 422 });
    }
    return NextResponse.json({ error: "No se pudo crear el tag." }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
