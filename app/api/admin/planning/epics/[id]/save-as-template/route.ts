import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveAsTemplateSchema } from "@/lib/validation/planning";
import { dueOffsetDaysFor } from "@/lib/planning/dates";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("planning_admin");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = saveAsTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const [{ data: epic, error: epicErr }, { data: tasks, error: tasksErr }] = await Promise.all([
    admin.from("shg_epics").select("due_date").eq("id", params.id).maybeSingle(),
    admin.from("shg_tasks").select("title, description, due_date").eq("epic_id", params.id).order("created_at"),
  ]);
  if (epicErr || tasksErr || !epic) return NextResponse.json({ error: "No se pudo leer la épica." }, { status: 500 });

  const { data: template, error: insertError } = await admin
    .from("shg_epic_templates")
    .insert({ name: parsed.data.name, description: parsed.data.description ?? null })
    .select()
    .single();
  if (insertError) return NextResponse.json({ error: "No se pudo crear la plantilla." }, { status: 500 });

  if ((tasks ?? []).length > 0) {
    const rows = (tasks ?? []).map((t, i) => ({
      template_id: template.id,
      title: t.title,
      description: t.description,
      due_offset_days: dueOffsetDaysFor(epic.due_date, t.due_date),
      position: i,
    }));
    const { error: ttErr } = await admin.from("shg_template_tasks").insert(rows);
    if (ttErr) {
      return NextResponse.json(
        { error: "Plantilla creada, pero no se pudieron copiar sus tareas.", data: template },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ data: template }, { status: 201 });
}
