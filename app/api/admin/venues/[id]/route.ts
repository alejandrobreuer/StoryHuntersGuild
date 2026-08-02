import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { venueSchema } from "@/lib/validation/venues";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = venueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_venues")
    .update({ ...parsed.data, map_url: parsed.data.map_url || null })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar el lugar." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_venues").delete().eq("id", params.id);
  if (deleteError) {
    return NextResponse.json({ error: "No se pudo eliminar — puede tener eventos asociados." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
