import { NextRequest, NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { taskUpdateSchema } from "@/lib/validation/planning";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_tasks")
    .select("*, assignee:shg_admin_users!shg_tasks_assignee_id_fkey(id, name), creator:shg_admin_users!shg_tasks_created_by_fkey(id, name)")
    .eq("id", params.id)
    .maybeSingle();

  if (dbErr) return NextResponse.json({ error: "Error al obtener la tarea." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const fields: Record<string, unknown> = { ...parsed.data };
  // Mirrors shg_planning_reorder_tasks' completed_at logic for the
  // non-drag edit path (status dropdown in the side panel).
  if (parsed.data.status === "done") {
    const { data: current } = await admin.from("shg_tasks").select("completed_at").eq("id", params.id).maybeSingle();
    fields.completed_at = current?.completed_at ?? new Date().toISOString();
  } else if (parsed.data.status) {
    fields.completed_at = null;
  }

  const { data, error: updateError } = await admin
    .from("shg_tasks")
    .update(fields)
    .eq("id", params.id)
    .select("*, assignee:shg_admin_users!shg_tasks_assignee_id_fkey(id, name)")
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar la tarea." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_tasks").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar la tarea." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
