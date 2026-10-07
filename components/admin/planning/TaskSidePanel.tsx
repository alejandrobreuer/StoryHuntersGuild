"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { CommentThread, type PlanningComment } from "@/components/admin/planning/CommentThread";
import { TASK_STATUS_LABEL } from "@/lib/planning/status";
import { formatPlanningDate } from "@/lib/planning/dates";
import type { ShgPlanningAssignee, PlanningTaskStatus } from "@/types/database";
import type { PlanningTask } from "@/components/admin/planning/types";

interface TaskSidePanelProps {
  taskId:         string;
  owners:         ShgPlanningAssignee[];
  currentUserId:  string;
  canDeleteAnyComment: boolean;
  onClose:        () => void;
  onTaskUpdated:  (task: PlanningTask) => void;
  onTaskDeleted:  (taskId: string) => void;
}

interface TaskDetail extends PlanningTask {
  creator: { id: string; name: string } | null;
}

export function TaskSidePanel({ taskId, owners, currentUserId, canDeleteAnyComment, onClose, onTaskUpdated, onTaskDeleted }: TaskSidePanelProps) {
  const [task, setTask] = React.useState<TaskDetail | null>(null);
  const [comments, setComments] = React.useState<PlanningComment[]>([]);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");

  const load = React.useCallback(async () => {
    const [taskRes, commentsRes] = await Promise.all([
      fetch(`/api/admin/planning/tasks/${taskId}`),
      fetch(`/api/admin/planning/tasks/${taskId}/comments`),
    ]);
    const taskJson = await taskRes.json();
    setTask(taskJson.data ?? null);
    setTitle(taskJson.data?.title ?? "");
    setDescription(taskJson.data?.description ?? "");
    setComments((await commentsRes.json()).data ?? []);
  }, [taskId]);

  React.useEffect(() => { load(); }, [load]);

  async function patchTask(fields: Partial<{ title: string; description: string | null; status: PlanningTaskStatus; assignee_id: string | null; due_date: string | null }>) {
    const res = await fetch(`/api/admin/planning/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "No se pudo guardar."); return; }
    setTask((t) => (t ? { ...t, ...json.data } : t));
    onTaskUpdated({ ...(task as PlanningTask), ...json.data });
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta tarea? También se eliminan sus comentarios.")) return;
    const res = await fetch(`/api/admin/planning/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo eliminar la tarea."); return; }
    toast.success("Tarea eliminada.");
    onTaskDeleted(taskId);
    onClose();
  }

  async function handleAddComment(body: string) {
    const res = await fetch(`/api/admin/planning/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "No se pudo publicar."); return; }
    setComments((c) => [...c, json.data]);
  }

  async function handleEditComment(id: string, body: string) {
    const res = await fetch(`/api/admin/planning/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "No se pudo editar."); return; }
    setComments((cs) => cs.map((c) => (c.id === id ? json.data : c)));
  }

  async function handleDeleteComment(id: string) {
    if (!confirm("¿Eliminar este comentario?")) return;
    const res = await fetch(`/api/admin/planning/comments/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo eliminar."); return; }
    setComments((cs) => cs.filter((c) => c.id !== id));
  }

  return (
    <Modal open onClose={onClose} title="Tarea" className="max-w-lg w-[92vw] h-[92vh] flex flex-col p-0" titleClassName="hidden">
      {!task ? (
        <p className="p-6 font-body italic text-ink-light">Cargando…</p>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-10 flex flex-col gap-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== task.title && patchTask({ title: title.trim() })}
            className="font-display text-xl font-bold text-ink bg-transparent outline-none focus:border-b focus:border-brass -mb-1"
          />

          <div className="grid grid-cols-2 gap-3.5">
            <Select
              label="Estado"
              value={task.status}
              onChange={(e) => patchTask({ status: e.target.value as PlanningTaskStatus })}
            >
              {(Object.keys(TASK_STATUS_LABEL) as PlanningTaskStatus[]).map((s) => (
                <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
              ))}
            </Select>
            <Select
              label="Asignado a"
              value={task.assignee?.id ?? ""}
              onChange={(e) => patchTask({ assignee_id: e.target.value || null })}
            >
              <option value="">Sin asignar</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
            <Input
              label="Fecha límite"
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) => patchTask({ due_date: e.target.value || null })}
            />
            <div className="flex flex-col gap-1.5">
              <span className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Creada</span>
              <span className="font-body text-sm text-ink py-2.5">
                {task.creator?.name ?? "—"}{task.created_at ? ` · ${formatPlanningDate(task.created_at.slice(0, 10))}` : ""}
              </span>
            </div>
          </div>

          <Textarea
            label="Descripción"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (task.description ?? "") && patchTask({ description: description || null })}
          />

          <CommentThread
            comments={comments}
            currentUserId={currentUserId}
            canDeleteAny={canDeleteAnyComment}
            onAdd={handleAddComment}
            onEdit={handleEditComment}
            onDelete={handleDeleteComment}
          />

          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 self-start font-label text-xs uppercase tracking-wide text-crimson hover:text-crimson/80"
          >
            <Trash2 size={13} /> Eliminar tarea
          </button>
        </div>
      )}
    </Modal>
  );
}
