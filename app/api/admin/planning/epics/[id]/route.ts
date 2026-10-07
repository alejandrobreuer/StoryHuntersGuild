import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { epicUpdateSchema } from "@/lib/validation/planning";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_epics")
    .select("*, event:shg_events(id, title, starts_at), owner:shg_admin_users!shg_epics_owner_id_fkey(id, name)")
    .eq("id", params.id)
    .maybeSingle();

  if (dbErr) return NextResponse.json({ error: "Error al obtener la épica." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Épica no encontrada." }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("planning_admin");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = epicUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_epics")
    .update(parsed.data)
    .eq("id", params.id)
    .select("*, event:shg_events(id, title, starts_at), owner:shg_admin_users!shg_epics_owner_id_fkey(id, name)")
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar la épica." }, { status: 500 });
  return NextResponse.json({ data });
}

// Cascades to shg_tasks (and their shg_task_comments) via FK on delete
// cascade — the client confirms the delete using the epic's already-loaded
// task count before calling this, no separate "how many tasks" round trip.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("planning_admin");
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_epics").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar la épica." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
