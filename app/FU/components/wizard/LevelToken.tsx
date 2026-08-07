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
        "fu-label flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-full border-2 border-[var(--fu-gold)] bg-[var(--fu-gold)]/10 text-xs font-bold text-[var(--fu-gold-bright)] shadow-[0_0_12px_rgba(232,178,60,0.15)] transition-opacity active:cursor-grabbing",
        isDragging && "z-50 opacity-90",
      )}
    >
      LV
    </div>
  );
}
