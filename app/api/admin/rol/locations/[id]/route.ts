import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { locationSchema } from "@/lib/validation/rol";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = locationSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_rol_location")
    .update({ ...parsed.data, icon_url: parsed.data.icon_url || undefined })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar la ubicación." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_rol_location").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar la ubicación." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
