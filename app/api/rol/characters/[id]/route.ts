import { NextRequest, NextResponse } from "next/server";
import { getAdminUser, requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { characterSchema } from "@/lib/validation/rol";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const { data } = await admin.from("shg_rol_character").select("*").eq("id", params.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Personaje no encontrado." }, { status: 404 });

  if (data.owner_id !== user.id) {
    const adminUser = await getAdminUser();
    if (!adminUser?.permissions.rol) {
      return NextResponse.json({ error: "No tenés acceso a este personaje." }, { status: 403 });
    }
  }

  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const { data: existing } = await admin.from("shg_rol_character").select("owner_id").eq("id", params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Personaje no encontrado." }, { status: 404 });

  if (existing.owner_id !== user.id) {
    const adminUser = await getAdminUser();
    if (!adminUser?.permissions.rol) {
      return NextResponse.json({ error: "No tenés acceso a este personaje." }, { status: 403 });
    }
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = characterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const { data, error: updateError } = await admin
    .from("shg_rol_character")
    .update({ name: parsed.data.name, sheet_data: parsed.data.sheet_data })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo guardar el personaje." }, { status: 500 });
  return NextResponse.json({ data });
}
