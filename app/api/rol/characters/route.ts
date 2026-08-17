import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { characterSchema } from "@/lib/validation/rol";

const MAX_CHARACTERS_PER_USER = 2;

export async function GET() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_rol_character")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener tus personajes." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = characterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("shg_rol_character")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((count ?? 0) >= MAX_CHARACTERS_PER_USER) {
    return NextResponse.json({ error: "Ya tenés el máximo de 2 personajes." }, { status: 422 });
  }

  const { data, error: insertError } = await admin
    .from("shg_rol_character")
    .insert({ owner_id: user.id, name: parsed.data.name, sheet_data: parsed.data.sheet_data })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear el personaje." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
