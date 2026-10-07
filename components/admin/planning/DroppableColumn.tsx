"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

/** Gives every status column/group a drop target even when it has no task
 * rows of its own to drag onto — id is "col:<status>", read back in
 * EpicDetailView's onDragEnd to resolve the destination status. */
export function DroppableColumn({ status, className, children }: { status: string; className?: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `col:${status}` });
  return <div ref={setNodeRef} className={cn(className)}>{children}</div>;
}
