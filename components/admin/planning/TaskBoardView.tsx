"use client";

import { Plus } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "@/components/admin/planning/TaskCard";
import { DroppableColumn } from "@/components/admin/planning/DroppableColumn";
import { TASK_STATUS_ORDER, TASK_STATUS_LABEL, TASK_STATUS_DOT_CLASS } from "@/lib/planning/status";
import type { PlanningTaskStatus } from "@/types/database";
import type { PlanningTask } from "@/components/admin/planning/types";

interface TaskBoardViewProps {
  tasksByStatus: Record<PlanningTaskStatus, PlanningTask[]>;
  onOpenTask: (id: string) => void;
  onQuickAddTodo: () => void;
}

export function TaskBoardView({ tasksByStatus, onOpenTask, onQuickAddTodo }: TaskBoardViewProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-4 gap-4 min-w-[900px] items-start">
        {TASK_STATUS_ORDER.map((status) => {
          const tasks = tasksByStatus[status];
          return (
            <section key={status} className="flex flex-col gap-2.5 p-3 rounded-sm bg-parchment-dark/30 min-h-[200px]">
              <h2 className="flex items-center justify-between font-label text-xs font-semibold uppercase tracking-widest text-ink">
                <span className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${TASK_STATUS_DOT_CLASS[status]}`} />
                  {TASK_STATUS_LABEL[status]}
                </span>
                <span className="text-leather-light">{tasks.length}</span>
              </h2>
              <DroppableColumn status={status} className="flex flex-col gap-2.5 min-h-[40px]">
                <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {tasks.map((t) => (
                    <TaskCard key={t.id} task={t} onOpen={() => onOpenTask(t.id)} />
                  ))}
                </SortableContext>
              </DroppableColumn>
              {status === "todo" && (
                <button
                  type="button"
                  onClick={onQuickAddTodo}
                  className="flex items-center justify-center gap-1.5 min-h-11 border border-dashed border-leather-light/60 rounded-sm text-leather-light hover:border-brass hover:text-brass font-label text-sm transition-colors"
                >
                  <Plus size={15} /> Agregar tarea
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
