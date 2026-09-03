import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { guildSchema } from "@/lib/validation/rol";

export async function GET() {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin.from("shg_rol_guild").select("*").limit(1).maybeSingle();
  if (dbErr) return NextResponse.json({ error: "Error al obtener el gremio." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = guildSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("shg_rol_guild").select("id").limit(1).maybeSingle();
  if (!existing) return NextResponse.json({ error: "El gremio no fue inicializado." }, { status: 404 });

  const { data, error: updateError } = await admin
    .from("shg_rol_guild")
    .update({
      ...parsed.data,
      image_url: parsed.data.image_url || null,
      description: parsed.data.description || null,
      current_guild_status_id: parsed.data.current_guild_status_id || null,
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (updateError) {
    console.error("[PATCH /api/admin/rol/guild] update failed:", updateError);
    return NextResponse.json({ error: `No se pudo actualizar el gremio: ${updateError.message}` }, { status: 500 });
  }
  return NextResponse.json({ data });
}
