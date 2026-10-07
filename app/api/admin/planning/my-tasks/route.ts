import { NextRequest, NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { myTasksGroupFor, MY_TASKS_GROUP_ORDER } from "@/lib/planning/dates";
import type { MyTasksGroupName } from "@/lib/planning/dates";
import { todayISOInEventTimeZone } from "@/lib/formatting";

// Server-side grouping (not client) so the Buenos-Aires "today"/timezone
// logic lives in exactly one place. ?includeDone=1 reveals a 5th "done"
// bucket instead of folding completed tasks into the date-based groups,
// where a long-past completed task's due_date would otherwise misleadingly
// read as "overdue" or "later".
export async function GET(req: NextRequest) {
  const { user, error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  const includeDone = new URL(req.url).searchParams.get("includeDone") === "1";

  const admin = createAdminClient();
  const { data: tasks, error: dbErr } = await admin
    .from("shg_tasks")
    .select("*, epic:shg_epics(id, title, status)")
    .eq("assignee_id", user.id);

  if (dbErr) return NextResponse.json({ error: "Error al obtener tus tareas." }, { status: 500 });

  const taskIds = (tasks ?? []).map((t) => t.id);
  const { data: commentRows } = taskIds.length
    ? await admin.from("shg_task_comments").select("task_id").in("task_id", taskIds)
    : { data: [] as { task_id: string }[] };
  const commentCounts = new Map<string, number>();
  for (const c of commentRows ?? []) commentCounts.set(c.task_id, (commentCounts.get(c.task_id) ?? 0) + 1);

  const today = todayISOInEventTimeZone();
  const groups = new Map<MyTasksGroupName, unknown[]>(MY_TASKS_GROUP_ORDER.map((g) => [g, []]));

  for (const t of tasks ?? []) {
    const epic = Array.isArray(t.epic) ? t.epic[0] : t.epic;
    if (!epic || epic.status === "done" || epic.status === "cancelled") continue;
    if (t.status === "done" && !includeDone) continue;

    const group: MyTasksGroupName = t.status === "done" ? "done" : myTasksGroupFor(t.due_date, t.status, today);
    groups.get(group)!.push({ ...t, epic, comment_count: commentCounts.get(t.id) ?? 0 });
  }

  const data = MY_TASKS_GROUP_ORDER
    .filter((g) => includeDone || g !== "done")
    .map((g) => ({ name: g, tasks: groups.get(g) ?? [] }));

  return NextResponse.json({ data });
}
