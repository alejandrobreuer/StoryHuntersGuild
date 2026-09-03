import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { guildFeatureSchema } from "@/lib/validation/rol";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = guildFeatureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_rol_guild_feature")
    .update({ ...parsed.data, benefit: parsed.data.benefit || null, guild_status_id: parsed.data.guild_status_id || null })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    console.error("[PATCH /api/admin/rol/guild-features/[id]] update failed:", updateError);
    return NextResponse.json({ error: `No se pudo actualizar la función: ${updateError.message}` }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_rol_guild_feature").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar la función." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
