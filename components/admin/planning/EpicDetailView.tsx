"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Trash2, Save } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TaskListView } from "@/components/admin/planning/TaskListView";
import { TaskBoardView } from "@/components/admin/planning/TaskBoardView";
import { TaskSidePanel } from "@/components/admin/planning/TaskSidePanel";
import { EPIC_STATUS_LABEL, EPIC_STATUS_BADGE_CLASS } from "@/lib/planning/status";
import { TASK_STATUS_ORDER } from "@/lib/planning/status";
import { formatPlanningDate } from "@/lib/planning/dates";
import { cn } from "@/lib/utils";
import type { ShgEpic, ShgPlanningAssignee, PlanningEpicStatus, PlanningTaskStatus } from "@/types/database";
import type { PlanningTask } from "@/components/admin/planning/types";

interface EpicDetail extends ShgEpic {
  event: { id: string; title: string; starts_at: string } | null;
  owner: { id: string; name: string } | null;
}

const VIEW_STORAGE_KEY = "shg-planning-view";

function groupByStatus(tasks: PlanningTask[]): Record<PlanningTaskStatus, PlanningTask[]> {
  const grouped = Object.fromEntries(TASK_STATUS_ORDER.map((s) => [s, [] as PlanningTask[]])) as Record<PlanningTaskStatus, PlanningTask[]>;
  for (const t of [...tasks].sort((a, b) => a.position - b.position)) grouped[t.status].push(t);
  return grouped;
}

export function EpicDetailView({ epicId, canManage, currentUserId }: { epicId: string; canManage: boolean; currentUserId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTaskId = searchParams.get("task");

  const [epic, setEpic] = React.useState<EpicDetail | null>(null);
  const [tasks, setTasks] = React.useState<PlanningTask[]>([]);
  const [owners, setOwners] = React.useState<ShgPlanningAssignee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"list" | "board">("list");
  const [assigneeFilter, setAssigneeFilter] = React.useState("");
  const [mineOnly, setMineOnly] = React.useState(false);
  const [quickAddValue, setQuickAddValue] = React.useState("");
  const [saveTemplateOpen, setSaveTemplateOpen] = React.useState(false);
  const quickAddRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [epicRes, tasksRes] = await Promise.all([
      fetch(`/api/admin/planning/epics/${epicId}`),
      fetch(`/api/admin/planning/epics/${epicId}/tasks`),
    ]);
    setEpic((await epicRes.json()).data ?? null);
    setTasks((await tasksRes.json()).data ?? []);
    setLoading(false);
  }, [epicId]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    fetch("/api/admin/planning/assignable-users").then((r) => r.json()).then((j) => setOwners(j.data ?? []));
  }, []);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "list" || saved === "board") setViewMode(saved);
    } catch { /* ignore */ }
  }, []);

  function setView(mode: "list" | "board") {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_STORAGE_KEY, mode); } catch { /* ignore */ }
  }

  function openTask(id: string) {
    router.push(`${pathname}?task=${id}`, { scroll: false });
  }
  function closeTask() {
    router.push(pathname, { scroll: false });
  }

  async function patchEpic(fields: Partial<{ title: string; description: string | null; status: PlanningEpicStatus; owner_id: string | null; due_date: string | null }>) {
    const res = await fetch(`/api/admin/planning/epics/${epicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "No se pudo guardar."); return; }
    setEpic(json.data);
  }

  async function handleDeleteEpic() {
    const taskCount = tasks.length;
    if (!confirm(`¿Eliminar esta épica? Se eliminarán sus ${taskCount} tarea${taskCount === 1 ? "" : "s"} y comentarios.`)) return;
    const res = await fetch(`/api/admin/planning/epics/${epicId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo eliminar."); return; }
    toast.success("Épica eliminada.");
    router.push("/admin/planning");
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAddValue.trim()) return;
    const res = await fetch(`/api/admin/planning/epics/${epicId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: quickAddValue.trim() }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "No se pudo crear la tarea."); return; }
    setTasks((t) => [...t, json.data]);
    setQuickAddValue("");
  }

  async function handleToggleDone(task: PlanningTask) {
    const nextStatus: PlanningTaskStatus = task.status === "done" ? "todo" : "done";
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    const res = await fetch(`/api/admin/planning/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) { toast.error("No se pudo actualizar."); load(); return; }
    const json = await res.json();
    setTasks((ts) => ts.map((t) => (t.id === task.id ? json.data : t)));
  }

  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (mineOnly) return t.assignee?.id === currentUserId;
      if (assigneeFilter === "unassigned") return !t.assignee;
      if (assigneeFilter) return t.assignee?.id === assigneeFilter;
      return true;
    });
  }, [tasks, assigneeFilter, mineOnly, currentUserId]);

  const tasksByStatus = React.useMemo(() => groupByStatus(filteredTasks), [filteredTasks]);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  function statusOfTask(id: string): PlanningTaskStatus | undefined {
    return tasks.find((t) => t.id === id)?.status;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const fromStatus = statusOfTask(activeId);
    const toStatus = overId.startsWith("col:") ? (overId.slice(4) as PlanningTaskStatus) : statusOfTask(overId);
    if (!fromStatus || !toStatus) return;

    const grouped = groupByStatus(tasks);
    const fromArr = grouped[fromStatus].filter((t) => t.id !== activeId);
    const moved = tasks.find((t) => t.id === activeId)!;
    const destArr = fromStatus === toStatus ? fromArr : grouped[toStatus].slice();
    const insertIndex = overId.startsWith("col:") ? destArr.length : destArr.findIndex((t) => t.id === overId);
    destArr.splice(insertIndex === -1 ? destArr.length : insertIndex, 0, { ...moved, status: toStatus });

    // Optimistic local state: reassign positions within the touched column(s).
    const nextTasks = tasks.map((t) => {
      if (t.id === activeId) return { ...t, status: toStatus };
      return t;
    });
    const withPositions = nextTasks.map((t) => {
      const column = t.id === activeId ? destArr : t.status === fromStatus && fromStatus !== toStatus ? fromArr : t.status === toStatus ? destArr : null;
      if (!column) return t;
      const idx = column.findIndex((c) => c.id === t.id);
      return idx === -1 ? t : { ...t, position: idx };
    });
    setTasks(withPositions);

    const calls = [
      fetch(`/api/admin/planning/epics/${epicId}/tasks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toStatus, ordered_ids: destArr.map((t) => t.id) }),
      }),
    ];
    if (fromStatus !== toStatus) {
      calls.push(
        fetch(`/api/admin/planning/epics/${epicId}/tasks/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: fromStatus, ordered_ids: fromArr.map((t) => t.id) }),
        })
      );
    }
    const results = await Promise.all(calls);
    if (results.some((r) => !r.ok)) { toast.error("No se pudo reordenar."); load(); }
  }

  if (loading || !epic) return <p className="font-body italic text-parchment-dark">Cargando…</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="surface-parchment p-6 flex flex-col gap-3.5">
        <div className="flex flex-wrap justify-between items-start gap-3">
          {canManage ? (
            <input
              defaultValue={epic.title}
              onBlur={(e) => e.target.value.trim() && e.target.value !== epic.title && patchEpic({ title: e.target.value.trim() })}
              className="flex-1 min-w-[240px] font-display text-2xl font-bold text-ink bg-transparent outline-none focus:border-b focus:border-brass"
            />
          ) : (
            <h1 className="font-display text-2xl font-bold text-ink">{epic.title}</h1>
          )}
          <div className="flex items-center gap-2">
            {canManage ? (
              <Select
                value={epic.status}
                onChange={(e) => patchEpic({ status: e.target.value as PlanningEpicStatus })}
                wrapperClassName="w-44"
              >
                {(Object.keys(EPIC_STATUS_LABEL) as PlanningEpicStatus[]).map((s) => (
                  <option key={s} value={s}>{EPIC_STATUS_LABEL[s]}</option>
                ))}
              </Select>
            ) : (
              <span className={cn("font-label text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-sm", EPIC_STATUS_BADGE_CLASS[epic.status])}>
                {EPIC_STATUS_LABEL[epic.status]}
              </span>
            )}
          </div>
        </div>

        {canManage ? (
          <Textarea
            defaultValue={epic.description ?? ""}
            rows={2}
            placeholder="Descripción (opcional)"
            onBlur={(e) => e.target.value !== (epic.description ?? "") && patchEpic({ description: e.target.value || null })}
          />
        ) : (
          epic.description && <p className="font-body text-ink-light max-w-[70ch]">{epic.description}</p>
        )}

        <div className="flex flex-wrap gap-6 font-label text-sm text-leather-light items-center">
          <span>Evento: <strong className="text-ink font-semibold">{epic.event?.title ?? "Sin vincular"}</strong></span>
          {canManage ? (
            <label className="flex items-center gap-2">Dueño
              <Select value={epic.owner_id ?? ""} onChange={(e) => patchEpic({ owner_id: e.target.value || null })} wrapperClassName="w-40">
                <option value="">Sin asignar</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            </label>
          ) : (
            <span>Dueño: <strong className="text-ink font-semibold">{epic.owner?.name ?? "Sin asignar"}</strong></span>
          )}
          {canManage ? (
            <label className="flex items-center gap-2">Vence
              <Input type="date" value={epic.due_date ?? ""} onChange={(e) => patchEpic({ due_date: e.target.value || null })} wrapperClassName="w-40" />
            </label>
          ) : (
            epic.due_date && <span>Vence: <strong className="text-ink font-semibold">{formatPlanningDate(epic.due_date)}</strong></span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ProgressBar value={doneTasks} max={totalTasks} className="flex-1" />
          <span className="font-label text-sm text-leather-light whitespace-nowrap">{doneTasks} de {totalTasks} hechas</span>
        </div>

        {canManage && totalTasks > 0 && doneTasks === totalTasks && epic.status !== "done" && (
          <div className="flex items-center justify-between gap-3 bg-moss/10 border border-moss/30 rounded-sm px-3.5 py-2.5">
            <p className="font-body text-sm text-moss-dark">Todas las tareas están hechas — ¿marcar la épica como Hecho?</p>
            <Button size="sm" onClick={() => patchEpic({ status: "done" })}>Marcar como Hecho</Button>
          </div>
        )}

        {canManage && (
          <div className="flex gap-4 pt-1 border-t border-border/60">
            <button type="button" onClick={() => setSaveTemplateOpen(true)} className="flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-leather-light hover:text-brass mt-2">
              <Save size={13} /> Guardar como plantilla
            </button>
            <button type="button" onClick={handleDeleteEpic} className="flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-leather-light hover:text-crimson mt-2">
              <Trash2 size={13} /> Eliminar épica
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex border border-border rounded-sm overflow-hidden font-label text-sm">
          <button type="button" onClick={() => setView("list")} className={cn("min-h-10 px-4", viewMode === "list" ? "bg-ink text-parchment" : "bg-parchment text-ink")}>Lista</button>
          <button type="button" onClick={() => setView("board")} className={cn("min-h-10 px-4", viewMode === "board" ? "bg-ink text-parchment" : "bg-parchment text-ink")}>Tablero</button>
        </div>
        <Select wrapperClassName="w-44" value={assigneeFilter} onChange={(e) => { setAssigneeFilter(e.target.value); setMineOnly(false); }}>
          <option value="">Cualquier asignado</option>
          <option value="unassigned">Sin asignar</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Select>
        <button
          type="button"
          onClick={() => { setMineOnly((m) => !m); setAssigneeFilter(""); }}
          className={cn("min-h-10 px-4 rounded-full border font-label text-sm", mineOnly ? "bg-brass text-ink border-brass" : "border-border text-ink-light")}
        >
          Mías
        </button>
      </div>

      <form onSubmit={handleQuickAdd} className="flex items-center gap-2.5 px-3.5 min-h-12 bg-parchment/90 border border-dashed border-leather-light/60 rounded-sm">
        <span className="text-leather-light font-label text-lg leading-none">+</span>
        <input
          ref={quickAddRef}
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          placeholder="Agregar una tarea y presionar Enter…"
          className="flex-1 bg-transparent outline-none font-body text-base text-ink placeholder:text-leather-light/70"
        />
      </form>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {viewMode === "list" ? (
          <TaskListView tasksByStatus={tasksByStatus} onOpenTask={openTask} onToggleDone={handleToggleDone} />
        ) : (
          <TaskBoardView tasksByStatus={tasksByStatus} onOpenTask={openTask} onQuickAddTodo={() => quickAddRef.current?.focus()} />
        )}
      </DndContext>

      {openTaskId && (
        <TaskSidePanel
          taskId={openTaskId}
          owners={owners}
          currentUserId={currentUserId}
          canDeleteAnyComment={canManage}
          onClose={closeTask}
          onTaskUpdated={(updated) => setTasks((ts) => ts.map((t) => (t.id === updated.id ? updated : t)))}
          onTaskDeleted={(id) => setTasks((ts) => ts.filter((t) => t.id !== id))}
        />
      )}

      {saveTemplateOpen && (
        <SaveAsTemplateModal epicId={epicId} onClose={() => setSaveTemplateOpen(false)} />
      )}
    </div>
  );
}

function SaveAsTemplateModal({ epicId, onClose }: { epicId: string; onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/planning/epics/${epicId}/save-as-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo guardar."); return; }
      toast.success("Plantilla creada.");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Guardar como plantilla">
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <Input label="Nombre de la plantilla" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
      </form>
    </Modal>
  );
}
