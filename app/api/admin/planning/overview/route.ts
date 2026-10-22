import { NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Planning → Resumen. Every task of every epic that isn't cancelled, plus
// those epics (soonest due first) to group them under. Columns and the
// Desde/Hasta filter are applied on the client (lib/planning/overview.ts),
// so changing a filter needs no new request.
export async function GET() {
  const { error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  const admin = createAdminClient();
  const { data: epics, error: epicErr } = await admin
    .from("shg_epics")
    .select("id, title, status, due_date")
    .neq("status", "cancelled")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (epicErr) return NextResponse.json({ error: "Error al obtener el resumen." }, { status: 500 });

  const epicIds = (epics ?? []).map((e) => e.id);
  const { data: tasks, error: taskErr } = epicIds.length
    ? await admin
        .from("shg_tasks")
        .select("*, assignee:shg_admin_users!shg_tasks_assignee_id_fkey(id, name)")
        .in("epic_id", epicIds)
        .order("position", { ascending: true })
    : { data: [], error: null };
  if (taskErr) return NextResponse.json({ error: "Error al obtener el resumen." }, { status: 500 });

  const taskIds = (tasks ?? []).map((t) => t.id);
  const { data: commentRows } = taskIds.length
    ? await admin.from("shg_task_comments").select("task_id").in("task_id", taskIds)
    : { data: [] as { task_id: string }[] };
  const commentCounts = new Map<string, number>();
  for (const c of commentRows ?? []) commentCounts.set(c.task_id, (commentCounts.get(c.task_id) ?? 0) + 1);

  return NextResponse.json({
    data: {
      epics: epics ?? [],
      tasks: (tasks ?? []).map((t) => ({ ...t, comment_count: commentCounts.get(t.id) ?? 0 })),
    },
  });
}
