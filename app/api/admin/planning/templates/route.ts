import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { templateSchema } from "@/lib/validation/planning";

export async function GET() {
  const { error } = await requirePermission("planning_admin");
  if (error) return error;

  const admin = createAdminClient();
  const { data: templates, error: dbErr } = await admin
    .from("shg_epic_templates")
    .select("*")
    .order("name");

  if (dbErr) return NextResponse.json({ error: "Error al obtener plantillas." }, { status: 500 });

  const templateIds = (templates ?? []).map((t) => t.id);
  const { data: taskRows } = templateIds.length
    ? await admin.from("shg_template_tasks").select("template_id").in("template_id", templateIds)
    : { data: [] as { template_id: string }[] };

  const counts = new Map<string, number>();
  for (const t of taskRows ?? []) counts.set(t.template_id, (counts.get(t.template_id) ?? 0) + 1);

  const data = (templates ?? []).map((t) => ({ ...t, task_count: counts.get(t.id) ?? 0 }));
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
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
  const { data: template, error: insertError } = await admin
    .from("shg_epic_templates")
    .insert({ name: parsed.data.name, description: parsed.data.description ?? null })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear la plantilla." }, { status: 500 });

  if (parsed.data.tasks.length > 0) {
    const rows = parsed.data.tasks.map((t, i) => ({
      template_id: template.id,
      title: t.title,
      description: t.description ?? null,
      due_offset_days: t.due_offset_days ?? null,
      position: i,
    }));
    const { error: tasksError } = await admin.from("shg_template_tasks").insert(rows);
    if (tasksError) return NextResponse.json({ error: "Plantilla creada, pero no se pudieron guardar sus tareas." }, { status: 500 });
  }

  return NextResponse.json({ data: template }, { status: 201 });
}
