import { NextRequest, NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { taskCreateSchema } from "@/lib/validation/planning";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  const admin = createAdminClient();
  const { data: tasks, error: dbErr } = await admin
    .from("shg_tasks")
    .select("*, assignee:shg_admin_users!shg_tasks_assignee_id_fkey(id, name)")
    .eq("epic_id", params.id)
    .order("position", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener tareas." }, { status: 500 });

  const taskIds = (tasks ?? []).map((t) => t.id);
  const { data: commentRows } = taskIds.length
    ? await admin.from("shg_task_comments").select("task_id").in("task_id", taskIds)
    : { data: [] as { task_id: string }[] };

  const commentCounts = new Map<string, number>();
  for (const c of commentRows ?? []) commentCounts.set(c.task_id, (commentCounts.get(c.task_id) ?? 0) + 1);

  const data = (tasks ?? []).map((t) => ({ ...t, comment_count: commentCounts.get(t.id) ?? 0 }));
  return NextResponse.json({ data });
}

// Quick-add: always lands in "todo", appended to the end of that column —
// staff-allowed per spec (task create/delete is one of the few epic-scoped
// actions available without planning_admin).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("shg_tasks")
    .select("position")
    .eq("epic_id", params.id)
    .eq("status", "todo")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error: insertError } = await admin
    .from("shg_tasks")
    .insert({
      ...parsed.data,
      epic_id: params.id,
      status: "todo",
      position: (last?.position ?? -1) + 1,
      created_by: user.id,
    })
    .select("*, assignee:shg_admin_users!shg_tasks_assignee_id_fkey(id, name)")
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear la tarea." }, { status: 500 });
  return NextResponse.json({ data: { ...data, comment_count: 0 } }, { status: 201 });
}
