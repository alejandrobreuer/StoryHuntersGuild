"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskRow } from "@/components/admin/planning/TaskRow";
import { DroppableColumn } from "@/components/admin/planning/DroppableColumn";
import { TASK_STATUS_ORDER, TASK_STATUS_LABEL, TASK_STATUS_DOT_CLASS } from "@/lib/planning/status";
import type { PlanningTaskStatus } from "@/types/database";
import type { PlanningTask } from "@/components/admin/planning/types";

interface TaskListViewProps {
  tasksByStatus: Record<PlanningTaskStatus, PlanningTask[]>;
  onOpenTask: (id: string) => void;
  onToggleDone: (task: PlanningTask) => void;
}

export function TaskListView({ tasksByStatus, onOpenTask, onToggleDone }: TaskListViewProps) {
  return (
    <div className="flex flex-col gap-5">
      {TASK_STATUS_ORDER.map((status) => {
        const tasks = tasksByStatus[status];
        return (
          <section key={status} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 font-label text-xs font-semibold uppercase tracking-widest text-leather-light">
              <span className={`size-2.5 rounded-full ${TASK_STATUS_DOT_CLASS[status]}`} />
              {TASK_STATUS_LABEL[status]} <span className="text-ink-light/70">{tasks.length}</span>
            </h2>
            <DroppableColumn status={status} className="surface-parchment overflow-hidden min-h-[8px]">
              <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} onOpen={() => onOpenTask(t.id)} onToggleDone={() => onToggleDone(t)} />
                ))}
              </SortableContext>
            </DroppableColumn>
          </section>
        );
      })}
    </div>
  );
}
