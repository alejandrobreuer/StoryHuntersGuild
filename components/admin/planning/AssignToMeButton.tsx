"use client";

import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

/** "Asignarme" — takes a task in one click. Stops the click and pointer-down
 * from reaching the row/card around it, which open the task or start a drag. */
export function AssignToMeButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      title="Asignarme esta tarea"
      className={cn(
        "shrink-0 inline-flex items-center gap-1 min-h-8 px-2.5 rounded-full border border-brass/60",
        "font-label text-xs text-brass hover:bg-brass hover:text-ink transition-colors",
        className,
      )}
    >
      <UserPlus size={13} /> Asignarme
    </button>
  );
}

/** Shown on tasks nobody has taken yet that are still open. */
export function canAssignToMe(task: { status: string; assignee_id: string | null }): boolean {
  return task.status !== "done" && !task.assignee_id;
}
