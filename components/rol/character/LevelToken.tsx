"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export function LevelToken({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "font-label flex h-14 w-14 shrink-0 cursor-grab touch-none items-center justify-center rounded-full border-2 border-brass bg-brass/10 text-xs font-bold text-brass-bright shadow-seal transition-opacity active:cursor-grabbing",
        isDragging && "z-50 opacity-90"
      )}
    >
      NV
    </div>
  );
}
