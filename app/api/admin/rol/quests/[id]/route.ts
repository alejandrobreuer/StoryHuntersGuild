import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questSchema } from "@/lib/validation/rol";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
  const { data: existing } = await admin.from("shg_rol_quest").select("status").eq("id", params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  if (existing.status !== "available") {
    return NextResponse.json({ error: "Solo se pueden editar misiones que todavía no fueron iniciadas." }, { status: 422 });
  }

  const { data, error: updateError } = await admin
    .from("shg_rol_quest")
    .update({ ...parsed.data, location_id: parsed.data.location_id || null })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar la misión." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_rol_quest").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar la misión." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
