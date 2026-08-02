import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { venueSchema } from "@/lib/validation/venues";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin.from("shg_venues").select("*").order("name");
  if (dbErr) return NextResponse.json({ error: "Error al obtener lugares." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = venueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("shg_venues")
    .insert({ ...parsed.data, map_url: parsed.data.map_url || null })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear el lugar." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
