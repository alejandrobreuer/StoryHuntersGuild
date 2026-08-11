import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleSchema } from "@/lib/validation/roles";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("roles");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_security_roles")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === "23505") {
      return NextResponse.json({ error: "Ya existe un rol con ese nombre." }, { status: 422 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el rol." }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("roles");
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_security_roles").delete().eq("id", params.id);

  if (deleteError) {
    if (deleteError.code === "23503") {
      return NextResponse.json({ error: "No se puede eliminar: hay administradores con este rol." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo eliminar el rol." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
