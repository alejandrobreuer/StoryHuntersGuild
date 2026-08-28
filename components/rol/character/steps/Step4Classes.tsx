"use client";

import { DndContext, type DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  MAX_CLASSES,
  MIN_CLASSES,
  TOTAL_CREATION_LEVELS,
  classCount,
  totalLevelsPlaced,
  useWizard,
} from "@/app/FU/lib/wizardState";
import { useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import { InfoDisclosure } from "../InfoDisclosure";
import { ClassPicker } from "../ClassPicker";
import { ClassSlot } from "../ClassSlot";
import { LevelToken } from "../LevelToken";

const SLOT_PREFIX = "class-slot-";

export function Step4Classes() {
  const { draft, dispatch } = useWizard();
  const { classesById } = useReferenceDataContext();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
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
        <h2 className="font-display text-2xl font-bold text-brass-bright">Clases</h2>
        <p className="mt-2 flex items-start text-sm text-ink-light font-body">
          Elegí 2 a 3 Clases y repartí tus cinco niveles iniciales entre ellas.
          <InfoDisclosure label="Por qué importan las Clases">
            Cada nivel invertido en una Clase otorga una de sus Habilidades (las repetibles se
            acumulan en un Nivel de Habilidad mayor).
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
          "font-label sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 border px-4 py-2.5 text-xs uppercase tracking-wide",
          valid ? "border-moss/40 bg-moss/10 text-moss-dark" : "border-brass/30 bg-brass/5 text-brass"
        )}
      >
        <span>{placed}/{TOTAL_CREATION_LEVELS} niveles asignados</span>
        <span>{count}/{MAX_CLASSES} clases (mín. {MIN_CLASSES})</span>
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
                  onRemoveLevel={() => dispatch({ type: "SET_CLASS_LEVELS", classId: cl.classId, levels: cl.levels - 1 })}
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

        <div className="surface-parchment flex flex-wrap items-center gap-4 p-5">
          <span className="font-label text-xs uppercase tracking-wide text-ink-light">
            {remaining > 0 ? "Arrastrá un nivel a una clase de arriba" : "Todos los niveles asignados"}
          </span>
          <div className="flex gap-2">
            {Array.from({ length: remaining }).map((_, i) => <LevelToken key={i} id={`level-token-${i}`} />)}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
