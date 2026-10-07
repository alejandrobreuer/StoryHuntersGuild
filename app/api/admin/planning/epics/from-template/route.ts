import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEpicFromTemplateSchema } from "@/lib/validation/planning";
import { subtractDaysISO } from "@/lib/planning/dates";

// Tasks are copied, not linked — editing the template afterward never
// changes epics already created from it. If the epic has no due date, every
// copied task also has no due date (no "today + offset" fallback), per spec.
export async function POST(req: NextRequest) {
  const { user, error } = await requirePermission("planning_admin");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = createEpicFromTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { template_id, ...epicFields } = parsed.data;

  const { data: templateTasks, error: ttErr } = await admin
    .from("shg_template_tasks")
    .select("title, description, due_offset_days")
    .eq("template_id", template_id)
    .order("position");
  if (ttErr) return NextResponse.json({ error: "No se pudo leer la plantilla." }, { status: 500 });

  const { data: epic, error: insertError } = await admin
    .from("shg_epics")
    .insert({ ...epicFields, created_by: user.id })
    .select("*, event:shg_events(id, title, starts_at), owner:shg_admin_users!shg_epics_owner_id_fkey(id, name)")
    .single();
  if (insertError) return NextResponse.json({ error: "No se pudo crear la épica." }, { status: 500 });

  if ((templateTasks ?? []).length > 0) {
    const rows = (templateTasks ?? []).map((t, i) => ({
      epic_id: epic.id,
      title: t.title,
      description: t.description,
      due_date: epic.due_date ? subtractDaysISO(epic.due_date, t.due_offset_days) : null,
      status: "todo" as const,
      position: i,
      created_by: user.id,
    }));
    const { error: tasksError } = await admin.from("shg_tasks").insert(rows);
    if (tasksError) {
      return NextResponse.json(
        { error: "Épica creada, pero no se pudieron copiar las tareas de la plantilla.", data: epic },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ data: epic }, { status: 201 });
}
