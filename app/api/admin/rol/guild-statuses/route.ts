import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { guildStatusSchema } from "@/lib/validation/rol";

export async function GET() {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_rol_guild_status")
    .select("*")
    .order("sort_order", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener los estados del gremio." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = guildStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: guild } = await admin.from("shg_rol_guild").select("id").limit(1).maybeSingle();
  if (!guild) return NextResponse.json({ error: "El gremio no fue inicializado." }, { status: 404 });

  const { data, error: insertError } = await admin
    .from("shg_rol_guild_status")
    .insert({ ...parsed.data, guild_id: guild.id })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear el estado." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
