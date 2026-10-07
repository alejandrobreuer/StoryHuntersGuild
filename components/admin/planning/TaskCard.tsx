"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare } from "lucide-react";
import { AssigneeAvatar } from "@/components/admin/planning/AssigneeAvatar";
import { formatPlanningDate } from "@/lib/planning/dates";
import { todayISOInEventTimeZone } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { PlanningTask } from "@/components/admin/planning/types";

export function TaskCard({ task, onOpen }: { task: PlanningTask; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const overdue = !!task.due_date && task.due_date < todayISOInEventTimeZone() && task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onOpen}
      {...attributes}
      {...listeners}
      className={cn(
        "flex flex-col gap-3 p-3.5 surface-parchment cursor-grab active:cursor-grabbing",
        task.status === "done" && "text-ink-light",
        isDragging && "opacity-40 rotate-2"
      )}
    >
      <p className="font-body text-sm leading-snug">{task.title}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 font-label text-xs">
          <span className={overdue ? "text-crimson font-bold" : "text-ink-light"}>
            {task.due_date ? formatPlanningDate(task.due_date) : ""}
          </span>
          <span className="flex items-center gap-1 text-ink-light"><MessageSquare size={13} />{task.comment_count}</span>
        </div>
        <AssigneeAvatar name={task.assignee?.name} />
      </div>
    </div>
  );
}
