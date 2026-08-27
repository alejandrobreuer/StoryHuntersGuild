import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { npcSchema } from "@/lib/validation/rol";

const SELECT = "*, residence:shg_rol_location(id, name), faction:shg_rol_faction(id, name)";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = npcSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_rol_npc")
    .update({
      ...parsed.data,
      residence_location_id: parsed.data.residence_location_id || null,
      faction_id: parsed.data.faction_id || null,
    })
    .eq("id", params.id)
    .select(SELECT)
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar el NPC." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_rol_npc").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar el NPC." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
