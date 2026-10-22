"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, ExternalLink, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { AssigneeAvatar } from "@/components/admin/planning/AssigneeAvatar";
import { AssignToMeButton, canAssignToMe } from "@/components/admin/planning/AssignToMeButton";
import { TaskSidePanel } from "@/components/admin/planning/TaskSidePanel";
import { TASK_STATUS_LABEL, TASK_STATUS_BADGE_CLASS } from "@/lib/planning/status";
import { formatPlanningDate, isTaskOverdue } from "@/lib/planning/dates";
import {
  OVERVIEW_COLUMNS, OVERVIEW_COLUMN_LABEL, closedOn, createdOn, groupByEpic, inDateRange, overviewColumnFor,
  type OverviewColumn,
} from "@/lib/planning/overview";
import { cn } from "@/lib/utils";
import type { ShgPlanningAssignee } from "@/types/database";
import type { PlanningTask } from "@/components/admin/planning/types";

// Planning → Resumen: every task of every epic that isn't cancelled, in
// Sin asignar / Asignadas / Completadas, grouped by epic. Clicking an epic
// collapses it in all three columns at once. Desde/Hasta filter on the
// creation date of open tasks and the close date of completed ones.

interface OverviewEpic { id: string; title: string }

const COLLAPSED_STORAGE_KEY = "shg-planning-overview-collapsed";

const COLUMN_DOT: Record<OverviewColumn, string> = {
  unassigned: "bg-leather-light",
  assigned:   "bg-brass",
  done:       "bg-moss",
};

export function OverviewView({ currentUserId, canDeleteAnyComment }: { currentUserId: string; canDeleteAnyComment: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTaskId = searchParams.get("task");
  const from = searchParams.get("desde") ?? "";
  const to = searchParams.get("hasta") ?? "";

  const [epics, setEpics] = React.useState<OverviewEpic[]>([]);
  const [tasks, setTasks] = React.useState<PlanningTask[]>([]);
  const [owners, setOwners] = React.useState<ShgPlanningAssignee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const load = React.useCallback(async () => {
    const res = await fetch("/api/admin/planning/overview");
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "No se pudo cargar el resumen."); setLoading(false); return; }
    setEpics(json.data.epics);
    setTasks(json.data.tasks);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    fetch("/api/admin/planning/assignable-users").then((r) => r.json()).then((j) => setOwners(j.data ?? []));
  }, []);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? "[]");
      if (Array.isArray(saved)) setCollapsed(new Set(saved.filter((x): x is string => typeof x === "string")));
    } catch { /* ignore */ }
  }, []);

  function saveCollapsed(next: Set<string>) {
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
  }

  function toggleEpic(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id); else next.add(id);
    saveCollapsed(next);
  }

  /** Changes ?desde= / ?hasta= / ?task= while keeping the rest. */
  function setParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v); else params.delete(k);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  async function assignToMe(task: PlanningTask) {
    const res = await fetch(`/api/admin/planning/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignee_id: currentUserId }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "No se pudo asignar."); return; }
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, ...json.data } : t)));
    toast.success("Tarea asignada a vos.");
  }

  const columns = React.useMemo(() => {
    const byColumn: Record<OverviewColumn, PlanningTask[]> = { unassigned: [], assigned: [], done: [] };
    for (const t of tasks) {
      if (inDateRange(t, from, to)) byColumn[overviewColumnFor(t)].push(t);
    }
    // Most recently closed first in Completadas.
    byColumn.done.sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
    return OVERVIEW_COLUMNS.map((c) => ({ column: c, count: byColumn[c].length, groups: groupByEpic(byColumn[c], epics) }));
  }, [tasks, epics, from, to]);

  const visibleEpicIds = React.useMemo(
    () => Array.from(new Set(columns.flatMap((c) => c.groups.map((g) => g.epic.id)))),
    [columns],
  );
  const allCollapsed = visibleEpicIds.length > 0 && visibleEpicIds.every((id) => collapsed.has(id));

  if (loading) return <p className="font-body italic text-parchment-dark">Cargando…</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="font-display text-2xl text-parchment mr-auto">Resumen</h1>
        <Input label="Desde" type="date" value={from} max={to || undefined}
          onChange={(e) => setParams({ desde: e.target.value || null })} wrapperClassName="w-40" />
        <Input label="Hasta" type="date" value={to} min={from || undefined}
          onChange={(e) => setParams({ hasta: e.target.value || null })} wrapperClassName="w-40" />
        {(from || to) && (
          <button type="button" onClick={() => setParams({ desde: null, hasta: null })}
            className="min-h-11 px-3 font-label text-sm text-parchment-dark hover:text-brass">
            Limpiar fechas
          </button>
        )}
        <button
          type="button"
          disabled={!visibleEpicIds.length}
          onClick={() => saveCollapsed(allCollapsed ? new Set() : new Set(visibleEpicIds))}
          className="min-h-11 px-4 rounded-full border border-border font-label text-sm text-parchment-dark hover:text-brass disabled:opacity-40"
        >
          {allCollapsed ? "Expandir épicas" : "Contraer épicas"}
        </button>
      </div>
      <p className="-mt-2 font-body text-sm text-parchment-dark/80">
        Las fechas filtran por creación en las tareas abiertas y por cierre en las completadas.
      </p>

      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-3 gap-4 min-w-[840px] items-start">
          {columns.map(({ column, count, groups }) => (
            <section key={column} className="flex flex-col gap-3 p-3 rounded-sm bg-parchment-dark/30 min-h-[200px]">
              <h2 className="flex items-center justify-between font-label text-xs font-semibold uppercase tracking-widest text-parchment">
                <span className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", COLUMN_DOT[column])} />
                  {OVERVIEW_COLUMN_LABEL[column]}
                </span>
                <span className="text-parchment-dark">{count}</span>
              </h2>
              {groups.length === 0 && (
                <p className="font-body text-sm italic text-parchment-dark/80 px-1">No hay tareas.</p>
              )}
              {groups.map(({ epic, tasks: epicTasks }) => {
                const isCollapsed = collapsed.has(epic.id);
                return (
                  <div key={epic.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleEpic(epic.id)}
                        aria-expanded={!isCollapsed}
                        title={isCollapsed ? "Mostrar las tareas de esta épica" : "Ocultar las tareas de esta épica"}
                        className="flex flex-1 min-w-0 items-center gap-1.5 min-h-9 px-1 text-left font-label text-sm font-semibold text-parchment hover:text-brass"
                      >
                        {isCollapsed ? <ChevronRight size={15} className="shrink-0" /> : <ChevronDown size={15} className="shrink-0" />}
                        <span className="truncate">{epic.title}</span>
                        <span className="shrink-0 font-normal text-parchment-dark">· {epicTasks.length}</span>
                      </button>
                      <Link href={`/admin/planning/${epic.id}`} title="Abrir épica" aria-label={`Abrir la épica ${epic.title}`}
                        className="shrink-0 inline-flex size-9 items-center justify-center text-parchment-dark hover:text-brass">
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                    {!isCollapsed && epicTasks.map((t) => (
                      <OverviewCard
                        key={t.id}
                        task={t}
                        onOpen={() => setParams({ task: t.id })}
                        onAssignToMe={() => assignToMe(t)}
                      />
                    ))}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>

      {openTaskId && (
        <TaskSidePanel
          taskId={openTaskId}
          owners={owners}
          currentUserId={currentUserId}
          canDeleteAnyComment={canDeleteAnyComment}
          onClose={() => setParams({ task: null })}
          onTaskUpdated={(updated) => setTasks((ts) => ts.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)))}
          onTaskDeleted={(id) => setTasks((ts) => ts.filter((t) => t.id !== id))}
        />
      )}
    </div>
  );
}

function OverviewCard({ task, onOpen, onAssignToMe }: { task: PlanningTask; onOpen: () => void; onAssignToMe: () => void }) {
  const overdue = isTaskOverdue(task.due_date, task.status);
  const closed = closedOn(task);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className={cn("flex flex-col gap-2 p-3 surface-parchment cursor-pointer", task.status === "done" && "text-ink-light")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-body text-sm leading-snug">{task.title}</p>
        <AssigneeAvatar name={task.assignee?.name} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-label text-xs text-ink-light">
        {task.status !== "done" && (
          <span className={cn("px-1.5 py-0.5 rounded-sm", TASK_STATUS_BADGE_CLASS[task.status])}>{TASK_STATUS_LABEL[task.status]}</span>
        )}
        <span title="Fecha de creación">Creada {formatPlanningDate(createdOn(task))}</span>
        {closed ? (
          <span className="text-moss-dark" title="Fecha de cierre">Cerrada {formatPlanningDate(closed)}</span>
        ) : task.due_date && (
          <span className={overdue ? "text-crimson font-bold" : undefined} title="Fecha límite">Vence {formatPlanningDate(task.due_date)}</span>
        )}
        {task.comment_count > 0 && <span className="flex items-center gap-1"><MessageSquare size={12} />{task.comment_count}</span>}
      </div>
      {canAssignToMe(task) && <AssignToMeButton onClick={onAssignToMe} className="self-start" />}
    </div>
  );
}
