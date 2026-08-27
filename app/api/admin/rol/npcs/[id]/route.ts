import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { npcSchema } from "@/lib/validation/rol";

const SELECT =
  "*, residence:shg_rol_location!shg_rol_npc_residence_location_id_fkey(id, name), " +
  "origin:shg_rol_location!shg_rol_npc_origin_location_id_fkey(id, name), " +
  "factions:shg_rol_npc_faction(is_former, faction:shg_rol_faction(id, name))";

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

  const { factions, ...npcFields } = parsed.data;
  const admin = createAdminClient();

  const { error: updateError } = await admin
    .from("shg_rol_npc")
    .update({
      ...npcFields,
      residence_location_id: npcFields.residence_location_id || null,
      origin_location_id: npcFields.origin_location_id || null,
      portrait_url: npcFields.portrait_url || null,
      full_body_url: npcFields.full_body_url || null,
    })
    .eq("id", params.id);

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar el NPC." }, { status: 500 });

  // Replace-all: simplest correct way to sync a GM-edited faction list —
  // this is a low-cardinality, admin-only relation, not a hot path.
  const { error: deleteLinksError } = await admin.from("shg_rol_npc_faction").delete().eq("npc_id", params.id);
  if (deleteLinksError) return NextResponse.json({ error: "No se pudieron actualizar las facciones." }, { status: 500 });

  if (factions.length > 0) {
    const { error: linkError } = await admin
      .from("shg_rol_npc_faction")
      .insert(factions.map((f) => ({ npc_id: params.id, faction_id: f.faction_id, is_former: f.is_former })));
    if (linkError) return NextResponse.json({ error: "No se pudieron guardar las facciones." }, { status: 500 });
  }

  const { data, error: selectError } = await admin.from("shg_rol_npc").select(SELECT).eq("id", params.id).single();
  if (selectError) return NextResponse.json({ error: "NPC actualizado, pero no se pudo recargar." }, { status: 500 });
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
