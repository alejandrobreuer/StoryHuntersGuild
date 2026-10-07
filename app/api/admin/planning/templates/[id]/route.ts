import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { templateSchema } from "@/lib/validation/planning";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("planning_admin");
  if (error) return error;

  const admin = createAdminClient();
  const [{ data: template, error: dbErr }, { data: tasks }] = await Promise.all([
    admin.from("shg_epic_templates").select("*").eq("id", params.id).maybeSingle(),
    admin.from("shg_template_tasks").select("*").eq("template_id", params.id).order("position"),
  ]);

  if (dbErr) return NextResponse.json({ error: "Error al obtener la plantilla." }, { status: 500 });
  if (!template) return NextResponse.json({ error: "Plantilla no encontrada." }, { status: 404 });
  return NextResponse.json({ data: { ...template, tasks: tasks ?? [] } });
}

// Diffs the submitted tasks[] against what's in the DB: rows carrying an
// `id` are updated in place, rows without one are inserted, and any
// existing row whose id is missing from the payload is deleted — the whole
// template editor submits its full current task list every save, same
// shape templateSchema already validates.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("planning_admin");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: template, error: updateError } = await admin
    .from("shg_epic_templates")
    .update({ name: parsed.data.name, description: parsed.data.description ?? null })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar la plantilla." }, { status: 500 });

  const { data: existingTasks } = await admin.from("shg_template_tasks").select("id").eq("template_id", params.id);
  const keepIds = new Set(parsed.data.tasks.filter((t) => t.id).map((t) => t.id as string));
  const toDelete = (existingTasks ?? []).map((t) => t.id).filter((id) => !keepIds.has(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await admin.from("shg_template_tasks").delete().in("id", toDelete);
    if (delErr) return NextResponse.json({ error: "No se pudieron actualizar las tareas de la plantilla." }, { status: 500 });
  }

  for (let i = 0; i < parsed.data.tasks.length; i++) {
    const t = parsed.data.tasks[i];
    const row = {
      template_id: params.id,
      title: t.title,
      description: t.description ?? null,
      due_offset_days: t.due_offset_days ?? null,
      position: i,
    };
    const { error: upsertErr } = t.id
      ? await admin.from("shg_template_tasks").update(row).eq("id", t.id)
      : await admin.from("shg_template_tasks").insert(row);
    if (upsertErr) return NextResponse.json({ error: "No se pudieron guardar las tareas de la plantilla." }, { status: 500 });
  }

  return NextResponse.json({ data: template });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("planning_admin");
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_epic_templates").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar la plantilla." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
