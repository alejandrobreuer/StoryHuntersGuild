"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EquipmentCardData } from "@/app/FU/lib/equipmentDisplay";

export type { EquipmentCardData };

/** Ported from app/FU. When `dragId` is given it's dnd-kit draggable; otherwise a static display card. */
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

  return (
    <div
      ref={dragId ? draggable.setNodeRef : undefined}
      {...(dragId ? draggable.listeners : {})}
      {...(dragId ? draggable.attributes : {})}
      style={dragId ? { transform: CSS.Translate.toString(draggable.transform) } : undefined}
      className={cn(
        "surface-parchment select-none p-3.5 text-left transition-colors",
        dragId && !disabled && "cursor-grab touch-none hover:border-brass active:cursor-grabbing",
        disabled && "opacity-40",
        draggable.isDragging && "z-50 opacity-90",
        compact && "p-3"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-sm font-semibold text-ink">{item.name}</span>
        <div className="flex items-center gap-1.5">
          {item.martial && <span className="font-label rounded bg-brass/15 px-2 py-0.5 text-2xs text-brass">Marcial</span>}
          {onRemove && (
            <button type="button" onClick={onRemove} aria-label={`Quitar ${item.name}`} className="text-leather-light hover:text-crimson">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-moss font-body">{item.statLine}</p>
      {!compact && item.notes && <p className="mt-1 text-xs text-ink-light font-body">{item.notes}</p>}
      <p className="mt-2 font-label text-xs text-ink-light">{item.cost === null ? "Sin costo" : `${item.cost} z`}</p>
    </div>
  );
}
