"use client";

import { useDroppable } from "@dnd-kit/core";
import { Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FUClass } from "@/app/FU/data/types";
import { SkillText } from "./SkillText";

function countTaken(skillsTaken: string[], name: string): number {
  return skillsTaken.filter((s) => s === name).length;
}

export function ClassSlot({
  cls,
  levels,
  skillsTaken,
  onRemoveLevel,
  onRemoveClass,
  onSetSkill,
}: {
  cls: FUClass;
  levels: number;
  skillsTaken: string[];
  onRemoveLevel: () => void;
  onRemoveClass: () => void;
  onSetSkill: (index: number, skillName: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `class-slot-${cls.id}` });

  return (
    <div
      ref={setNodeRef}
      className={cn("surface-parchment flex flex-col p-5 transition-colors", isOver && "border-brass bg-brass/5")}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-lg font-bold text-ink">{cls.name}</div>
          <div className="text-xs text-ink-light font-body">{cls.alsoKnownAs.join(" · ")}</div>
        </div>
        <button type="button" onClick={onRemoveClass} aria-label={`Quitar ${cls.name}`} className="text-leather-light hover:text-crimson">
          <X className="h-5 w-5" />
        </button>
      </div>

      <ul className="mt-2 space-y-1 text-sm text-ink-light font-body">
        {cls.freeBenefits.map((b, i) => <li key={i}>· {b.text}</li>)}
      </ul>

      <div className="mt-4 flex items-center gap-2">
        <span className="font-label text-xs uppercase tracking-wide text-ink-light">Niveles</span>
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={cn("h-3.5 w-3.5 rounded-full border", i < levels ? "border-brass bg-brass" : "border-border")} />
          ))}
        </div>
        <span className="font-label text-sm text-brass-bright">{levels}</span>
        {levels > 0 && (
          <button
            type="button"
            onClick={onRemoveLevel}
            aria-label={`Quitar un nivel de ${cls.name}`}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-border text-leather-light hover:border-crimson hover:text-crimson"
          >
            <Minus className="h-4 w-4" />
          </button>
        )}
      </div>

      {levels === 0 ? (
        <p className="font-label mt-4 border border-dashed border-border p-4 text-center text-xs uppercase tracking-wide text-ink-light">
          Arrastrá un nivel acá
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {Array.from({ length: levels }).map((_, rowIndex) => {
            const chosen = skillsTaken[rowIndex] ?? "";
            const available = cls.skills.filter((sk) => sk.name === chosen || countTaken(skillsTaken, sk.name) < sk.maxLevel);
            const chosenSkill = cls.skills.find((sk) => sk.name === chosen);
            return (
              <div key={rowIndex} className="border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-label text-xs uppercase tracking-wide text-ink-light">Nv {rowIndex + 1}</span>
                  <select
                    value={chosen}
                    onChange={(e) => onSetSkill(rowIndex, e.target.value)}
                    className="flex-1 border border-border bg-parchment/60 px-3 py-1.5 text-sm text-ink focus:border-brass focus:outline-none font-body"
                  >
                    <option value="">Elegí una Habilidad…</option>
                    {available.map((sk) => (
                      <option key={sk.name} value={sk.name}>
                        {sk.name}{sk.maxLevel > 1 ? ` (◇${sk.maxLevel})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {chosenSkill && (
                  <SkillText text={chosenSkill.text} skillLevel={countTaken(skillsTaken, chosenSkill.name)} className="mt-2 text-xs leading-snug text-ink-light font-body" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
