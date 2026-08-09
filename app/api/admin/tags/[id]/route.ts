import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { tagSchema } from "@/lib/validation/tags";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
  const { data, error: updateError } = await admin
    .from("shg_tags")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === "23505") {
      return NextResponse.json({ error: "Ese tag ya existe." }, { status: 422 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el tag." }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_tags").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar el tag." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
