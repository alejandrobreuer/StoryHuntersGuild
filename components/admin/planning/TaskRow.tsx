"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare } from "lucide-react";
import { AssigneeAvatar } from "@/components/admin/planning/AssigneeAvatar";
import { formatPlanningDate } from "@/lib/planning/dates";
import { todayISOInEventTimeZone } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { PlanningTask } from "@/components/admin/planning/types";

interface TaskRowProps {
  task: PlanningTask;
  onOpen: () => void;
  onToggleDone: () => void;
}

export function TaskRow({ task, onOpen, onToggleDone }: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const overdue = !!task.due_date && task.due_date < todayISOInEventTimeZone() && task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3.5 min-h-[52px] px-4 border-t border-border/60 first:border-t-0",
        isDragging && "opacity-50"
      )}
      {...attributes}
      {...listeners}
    >
      <input
        type="checkbox"
        aria-label="Marcar como hecho"
        checked={task.status === "done"}
        onChange={(e) => { e.stopPropagation(); onToggleDone(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="accent-moss size-[18px] shrink-0"
      />
      <button
        type="button"
        onClick={onOpen}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "flex-1 min-w-0 text-left font-body text-base truncate",
          task.status === "done" ? "text-ink-light line-through" : "text-ink"
        )}
      >
        {task.title}
      </button>
      <span className="shrink-0 flex items-center gap-1 font-label text-xs text-ink-light">
        <MessageSquare size={14} />{task.comment_count}
      </span>
      {task.due_date && (
        <span className={cn("shrink-0 w-20 text-right font-label text-xs", overdue ? "text-crimson font-bold" : "text-ink-light")}>
          {formatPlanningDate(task.due_date)}
        </span>
      )}
      <AssigneeAvatar name={task.assignee?.name} />
    </div>
  );
}
