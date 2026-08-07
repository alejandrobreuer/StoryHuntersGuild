"use client";

import { useDroppable } from "@dnd-kit/core";
import { Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FUClass } from "../../data/types";
import { SkillText } from "../shared/SkillText";

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
      className={cn(
        "fu-panel flex flex-col p-4 transition-colors",
        isOver && "border-[var(--fu-gold)] bg-[var(--fu-gold)]/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="fu-heading text-base font-bold text-[var(--fu-text)]">{cls.name}</div>
          <div className="text-[10px] text-[var(--fu-text-muted)]">{cls.alsoKnownAs.join(" · ")}</div>
        </div>
        <button
          type="button"
          onClick={onRemoveClass}
          aria-label={`Remove ${cls.name}`}
          className="text-[var(--fu-text-muted)] hover:text-[var(--fu-danger)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="mt-2 space-y-0.5 text-[11px] text-[var(--fu-text-muted)]">
        {cls.freeBenefits.map((b, i) => (
          <li key={i}>· {b.text}</li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <span className="fu-label text-[10px] text-[var(--fu-text-muted)]">Levels</span>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 w-2.5 rounded-full border",
                i < levels ? "border-[var(--fu-gold)] bg-[var(--fu-gold)]" : "border-[var(--fu-border)]",
              )}
            />
          ))}
        </div>
        <span className="fu-label text-[10px] text-[var(--fu-gold-bright)]">{levels}</span>
        {levels > 0 && (
          <button
            type="button"
            onClick={onRemoveLevel}
            aria-label={`Remove a level from ${cls.name}`}
            className="ml-auto flex h-5 w-5 items-center justify-center rounded-full border border-[var(--fu-border)] text-[var(--fu-text-muted)] hover:border-[var(--fu-danger)] hover:text-[var(--fu-danger)]"
          >
            <Minus className="h-3 w-3" />
          </button>
        )}
      </div>

      {levels === 0 ? (
        <p className="fu-label mt-3 rounded border border-dashed border-[var(--fu-border)] p-3 text-center text-[10px] text-[var(--fu-text-muted)]">
          Drag a level token here
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {Array.from({ length: levels }).map((_, rowIndex) => {
            const chosen = skillsTaken[rowIndex] ?? "";
            const available = cls.skills.filter(
              (sk) => sk.name === chosen || countTaken(skillsTaken, sk.name) < sk.maxLevel,
            );
            const chosenSkill = cls.skills.find((sk) => sk.name === chosen);
            return (
              <div key={rowIndex} className="rounded border border-[var(--fu-border)] p-2">
                <div className="flex items-center gap-2">
                  <span className="fu-label text-[10px] text-[var(--fu-text-muted)]">Lv {rowIndex + 1}</span>
                  <select
                    value={chosen}
                    onChange={(e) => onSetSkill(rowIndex, e.target.value)}
                    className="flex-1 rounded border border-[var(--fu-border)] bg-[var(--fu-bg-elevated)] px-2 py-1 text-xs text-[var(--fu-text)] focus:border-[var(--fu-gold)] focus:outline-none"
                  >
                    <option value="">Choose a Skill…</option>
                    {available.map((sk) => (
                      <option key={sk.name} value={sk.name}>
                        {sk.name}
                        {sk.maxLevel > 1 ? ` (◇${sk.maxLevel})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {chosenSkill && (
                  <SkillText
                    text={chosenSkill.text}
                    skillLevel={countTaken(skillsTaken, chosenSkill.name)}
                    className="mt-1.5 text-[11px] leading-snug text-[var(--fu-text-muted)]"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
