import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { gameSchema } from "@/lib/validation/games";

function slugify(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin.from("shg_games").select("*").order("name");
  if (dbErr) return NextResponse.json({ error: "Error al obtener juegos." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = gameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const { image_url, bgg_link, ...fields } = parsed.data;
  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("shg_games")
    .insert({ ...fields, image_url: image_url || null, bgg_link: bgg_link || null, slug: slugify(fields.name) })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear el juego." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
