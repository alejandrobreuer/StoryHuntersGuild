"use client";

import { DndContext, type DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { classesById } from "../../../data/classes";
import {
  MAX_CLASSES,
  MIN_CLASSES,
  TOTAL_CREATION_LEVELS,
  classCount,
  totalLevelsPlaced,
  useWizard,
} from "../../../lib/wizardState";
import { InfoDisclosure } from "../../shared/InfoDisclosure";
import { ClassPicker } from "../ClassPicker";
import { ClassSlot } from "../ClassSlot";
import { LevelToken } from "../LevelToken";

const SLOT_PREFIX = "class-slot-";

export function Step4Classes() {
  const { draft, dispatch } = useWizard();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const placed = totalLevelsPlaced(draft);
  const remaining = TOTAL_CREATION_LEVELS - placed;
  const count = classCount(draft);
  const valid = placed === TOTAL_CREATION_LEVELS && count >= MIN_CLASSES && count <= MAX_CLASSES;

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    if (typeof overId !== "string" || !overId.startsWith(SLOT_PREFIX)) return;
    if (remaining <= 0) return;
    const classId = overId.slice(SLOT_PREFIX.length);
    const slot = draft.classLevels.find((cl) => cl.classId === classId);
    if (!slot || slot.levels >= 5) return;
    dispatch({ type: "SET_CLASS_LEVELS", classId, levels: slot.levels + 1 });
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="fu-heading text-3xl font-bold text-[var(--fu-gold-bright)]">Classes</h2>
        <p className="mt-2 flex items-start text-base text-[var(--fu-text-muted)]">
          Choose 2–3 Classes and distribute your five starting levels among them.
          <InfoDisclosure label="Why Classes matter">
            Each level invested in a Class grants one of its Skills (repeatable ones stack into
            a higher Skill Level). If two or more of your Classes give the same free benefit,
            they stack. These represent your current abilities, not a permanent narrative
            box — you can steer your character differently later.
          </InfoDisclosure>
        </p>
      </header>

      <ClassPicker
        selectedIds={draft.classLevels.map((cl) => cl.classId)}
        onToggle={(classId) => {
          const exists = draft.classLevels.some((cl) => cl.classId === classId);
          dispatch(exists ? { type: "REMOVE_CLASS_SLOT", classId } : { type: "ADD_CLASS_SLOT", classId });
        }}
      />

      <div
        className={cn(
          "fu-label sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border px-4 py-2.5 text-sm",
          valid
            ? "border-[var(--fu-success)]/40 bg-[var(--fu-success)]/10 text-[var(--fu-success)]"
            : "border-[var(--fu-gold)]/30 bg-[var(--fu-gold)]/5 text-[var(--fu-gold)]",
        )}
      >
        <span>
          {placed}/{TOTAL_CREATION_LEVELS} levels placed
        </span>
        <span>
          {count}/{MAX_CLASSES} classes ({MIN_CLASSES} min)
        </span>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {draft.classLevels.length > 0 && (
          <div className={cn("grid gap-4", draft.classLevels.length > 1 && "lg:grid-cols-2")}>
            {draft.classLevels.map((cl) => {
              const cls = classesById[cl.classId];
              if (!cls) return null;
              return (
                <ClassSlot
                  key={cl.classId}
                  cls={cls}
                  levels={cl.levels}
                  skillsTaken={cl.skillsTaken}
                  onRemoveLevel={() =>
                    dispatch({ type: "SET_CLASS_LEVELS", classId: cl.classId, levels: cl.levels - 1 })
                  }
                  onRemoveClass={() => dispatch({ type: "REMOVE_CLASS_SLOT", classId: cl.classId })}
                  onSetSkill={(index, skillName) => {
                    const next = [...cl.skillsTaken];
                    next[index] = skillName;
                    dispatch({ type: "SET_CLASS_SKILLS", classId: cl.classId, skillsTaken: next });
                  }}
                />
              );
            })}
          </div>
        )}

        <div className="fu-panel flex flex-wrap items-center gap-4 p-5">
          <span className="fu-label text-sm text-[var(--fu-text-muted)]">
            {remaining > 0 ? "Drag a level onto a class above" : "All levels placed"}
          </span>
          <div className="flex gap-2">
            {Array.from({ length: remaining }).map((_, i) => (
              <LevelToken key={i} id={`level-token-${i}`} />
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
