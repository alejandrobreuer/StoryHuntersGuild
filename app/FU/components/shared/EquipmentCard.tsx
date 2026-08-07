"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EquipmentCardData {
  id: string;
  name: string;
  cost: number | null;
  martial: boolean;
  statLine: string;
  notes: string;
}

/**
 * Presentational weapon/armor/shield card. When `dragId` is given it becomes
 * a dnd-kit draggable (used in the shopping step's item pool); otherwise
 * it's a static display (used read-only on the character sheet).
 */
export function EquipmentCard({
  item,
  dragId,
  disabled,
  onRemove,
  compact,
}: {
  item: EquipmentCardData;
  dragId?: string;
  disabled?: boolean;
  onRemove?: () => void;
  compact?: boolean;
}) {
  const draggable = useDraggable({ id: dragId ?? item.id, disabled: !dragId || disabled });

  const content = (
    <div
      ref={dragId ? draggable.setNodeRef : undefined}
      {...(dragId ? draggable.listeners : {})}
      {...(dragId ? draggable.attributes : {})}
      style={dragId ? { transform: CSS.Translate.toString(draggable.transform) } : undefined}
      className={cn(
        "fu-panel select-none p-3.5 text-left transition-colors",
        dragId && !disabled && "cursor-grab touch-none hover:border-[var(--fu-border-bright)] active:cursor-grabbing",
        disabled && "opacity-40",
        draggable.isDragging && "z-50 opacity-90",
        compact && "p-3",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="fu-heading text-base font-semibold text-[var(--fu-text)]">{item.name}</span>
        <div className="flex items-center gap-1.5">
          {item.martial && (
            <span className="fu-label rounded bg-[var(--fu-gold)]/15 px-2 py-0.5 text-xs text-[var(--fu-gold)]">
              Martial
            </span>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${item.name}`}
              className="text-[var(--fu-text-muted)] hover:text-[var(--fu-danger)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-[var(--fu-cyan)]">{item.statLine}</p>
      {!compact && item.notes && <p className="mt-1 text-sm text-[var(--fu-text-muted)]">{item.notes}</p>}
      <p className="mt-2 fu-label text-sm text-[var(--fu-text-muted)]">
        {item.cost === null ? "No cost" : `${item.cost} z`}
      </p>
    </div>
  );

  return content;
}
