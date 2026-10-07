"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { TaskSidePanel } from "@/components/admin/planning/TaskSidePanel";
import { TASK_STATUS_LABEL, TASK_STATUS_BADGE_CLASS } from "@/lib/planning/status";
import { MY_TASKS_GROUP_LABEL, MY_TASKS_GROUP_ORDER, formatPlanningDate } from "@/lib/planning/dates";
import { todayISOInEventTimeZone } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { ShgPlanningAssignee, PlanningTaskStatus } from "@/types/database";
import type { PlanningTask } from "@/components/admin/planning/types";

interface MyTask extends PlanningTask {
  epic: { id: string; title: string };
}
interface Group { name: string; tasks: MyTask[] }

export function MyTasksView({ currentUserId, canDeleteAnyComment }: { currentUserId: string; canDeleteAnyComment: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTaskId = searchParams.get("task");

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [owners, setOwners] = React.useState<ShgPlanningAssignee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showDone, setShowDone] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/planning/my-tasks?includeDone=${showDone ? "1" : "0"}`);
    setGroups((await res.json()).data ?? []);
    setLoading(false);
  }, [showDone]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    fetch("/api/admin/planning/assignable-users").then((r) => r.json()).then((j) => setOwners(j.data ?? []));
  }, []);

  async function handleToggleDone(task: MyTask) {
    const nextStatus: PlanningTaskStatus = task.status === "done" ? "todo" : "done";
    const res = await fetch(`/api/admin/planning/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) { toast.error("No se pudo actualizar."); return; }
    load();
  }

  const totalCount = groups.reduce((sum, g) => sum + g.tasks.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Mis tareas</h1>
        <label className="flex items-center gap-2 font-body text-sm text-parchment-dark">
          <input type="checkbox" className="accent-moss size-4" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Mostrar hechas
        </label>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : totalCount === 0 ? (
        <p className="font-body italic text-parchment-dark">No tenés tareas asignadas.</p>
      ) : (
        <div className="flex flex-col gap-7">
          {MY_TASKS_GROUP_ORDER.filter((g) => showDone || g !== "done").map((groupName) => {
            const group = groups.find((g) => g.name === groupName);
            if (!group || group.tasks.length === 0) return null;
            return (
              <section key={groupName} className="flex flex-col gap-2.5">
                <h2 className={cn(
                  "font-label text-xs font-semibold uppercase tracking-widest",
                  groupName === "overdue" ? "text-crimson" : "text-parchment-dark"
                )}>
                  {MY_TASKS_GROUP_LABEL[groupName]} · {group.tasks.length}
                </h2>
                <div className="flex flex-col gap-2">
                  {group.tasks.map((t) => {
                    const overdue = !!t.due_date && t.due_date < todayISOInEventTimeZone() && t.status !== "done";
                    return (
                      <div key={t.id} className="flex items-start gap-3 p-3.5 surface-parchment">
                        <input
                          type="checkbox"
                          checked={t.status === "done"}
                          onChange={() => handleToggleDone(t)}
                          className="accent-moss size-[20px] mt-0.5 shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => router.push(`${pathname}?task=${t.id}`, { scroll: false })}
                          className="flex-1 min-w-0 flex flex-col gap-1.5 text-left"
                        >
                          <span className={cn("font-body text-base", t.status === "done" ? "text-ink-light line-through" : "text-ink")}>{t.title}</span>
                          <span className="font-label text-2xs text-ink-light">{t.epic.title}</span>
                          <span className="flex items-center gap-2.5 font-label text-xs">
                            <span className={cn("px-2 py-0.5 rounded-sm", TASK_STATUS_BADGE_CLASS[t.status])}>{TASK_STATUS_LABEL[t.status]}</span>
                            {t.due_date && <span className={overdue ? "text-crimson font-bold" : "text-ink-light"}>{formatPlanningDate(t.due_date)}</span>}
                            {t.comment_count > 0 && <span className="flex items-center gap-1 text-ink-light"><MessageSquare size={12} />{t.comment_count}</span>}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-6">
        <Link href="/admin/planning" className="font-label text-xs uppercase tracking-wide text-brass hover:text-brass-bright">
          Ver todas las épicas →
        </Link>
      </p>

      {openTaskId && (
        <TaskSidePanel
          taskId={openTaskId}
          owners={owners}
          currentUserId={currentUserId}
          canDeleteAnyComment={canDeleteAnyComment}
          onClose={() => router.push(pathname, { scroll: false })}
          onTaskUpdated={() => load()}
          onTaskDeleted={() => load()}
        />
      )}
    </div>
  );
}
