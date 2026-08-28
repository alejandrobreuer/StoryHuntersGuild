"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { classes, classesById } from "../../data/classes";
import type { FUClass } from "../../data/types";
import { calcDerivedStats } from "../../lib/derivedStats";
import type { FUCharacter, FUCharacterClassLevel } from "../../lib/types";
import { SkillText } from "../shared/SkillText";

function countTaken(skillsTaken: string[], name: string): number {
  return skillsTaken.filter((s) => s === name).length;
}

function resolveClasses(classLevels: FUCharacterClassLevel[]): FUClass[] {
  return classLevels.map((cl) => classesById[cl.classId]).filter((c): c is FUClass => Boolean(c));
}

/**
 * Fully self-contained staged flow: nothing here touches the sheet until
 * the parent's onApply is called. Cancel (or the backdrop) just unmounts
 * this component with zero side effects.
 */
export function LevelUpModal({
  character,
  onApply,
  onCancel,
}: {
  character: FUCharacter;
  onApply: (updated: FUCharacter) => void;
  onCancel: () => void;
}) {
  const existingClassIds = character.classLevels.map((cl) => cl.classId);
  const canAddNewClass = existingClassIds.length < 3;

  const [targetClassId, setTargetClassId] = useState<string | null>(existingClassIds[0] ?? null);
  const [newClassPick, setNewClassPick] = useState(false);
  const [chosenSkill, setChosenSkill] = useState("");

  const targetClass = targetClassId ? classesById[targetClassId] : null;
  const isNewClass = Boolean(targetClassId) && !existingClassIds.includes(targetClassId!);
  const existingSkillsTaken = character.classLevels.find((cl) => cl.classId === targetClassId)?.skillsTaken ?? [];

  const availableSkills = targetClass
    ? targetClass.skills.filter((sk) => countTaken(existingSkillsTaken, sk.name) < sk.maxLevel)
    : [];

  const previewCharacter: FUCharacter | null = useMemo(() => {
    if (!targetClassId || !chosenSkill) return null;
    const classLevels: FUCharacterClassLevel[] = isNewClass
      ? [...character.classLevels, { classId: targetClassId, levels: 1, skillsTaken: [chosenSkill] }]
      : character.classLevels.map((cl) =>
          cl.classId === targetClassId
            ? { ...cl, levels: cl.levels + 1, skillsTaken: [...cl.skillsTaken, chosenSkill] }
            : cl,
        );
    return { ...character, level: character.level + 1, classLevels };
  }, [character, targetClassId, chosenSkill, isNewClass]);

  const currentStats = calcDerivedStats(character.level, character.attributes, character.equipment, resolveClasses(character.classLevels));
  const previewStats = previewCharacter
    ? calcDerivedStats(previewCharacter.level, previewCharacter.attributes, previewCharacter.equipment, resolveClasses(previewCharacter.classLevels))
    : null;

  function handleApply() {
    if (!previewCharacter) return;
    onApply({ ...previewCharacter, updatedAt: new Date().toISOString() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="fu-panel fu-scrollbar max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="fu-heading text-2xl font-bold text-[var(--fu-gold-bright)]">Level Up</h2>
          <button type="button" onClick={onCancel} aria-label="Close">
            <X className="h-6 w-6 text-[var(--fu-text-muted)] hover:text-[var(--fu-text)]" />
          </button>
        </div>
        <p className="mt-1 text-base text-[var(--fu-text-muted)]">Advancing to level {character.level + 1}.</p>

        <div className="mt-5">
          <span className="fu-label text-sm text-[var(--fu-text-muted)]">Which Class gains the new level?</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {character.classLevels.map((cl) => {
              const cls = classesById[cl.classId];
              if (!cls) return null;
              const active = targetClassId === cl.classId && !newClassPick;
              return (
                <button
                  key={cl.classId}
                  type="button"
                  onClick={() => {
                    setTargetClassId(cl.classId);
                    setNewClassPick(false);
                    setChosenSkill("");
                  }}
                  className={cn(
                    "fu-label rounded-md border px-4 py-2 text-sm",
                    active
                      ? "border-[var(--fu-gold)] text-[var(--fu-gold)]"
                      : "border-[var(--fu-border)] text-[var(--fu-text-muted)]",
                  )}
                >
                  {cls.name} (Lv {cl.levels})
                </button>
              );
            })}
            {canAddNewClass && (
              <button
                type="button"
                onClick={() => {
                  setNewClassPick(true);
                  setTargetClassId(null);
                  setChosenSkill("");
                }}
                className={cn(
                  "fu-label rounded-md border px-4 py-2 text-sm",
                  newClassPick
                    ? "border-[var(--fu-gold)] text-[var(--fu-gold)]"
                    : "border-[var(--fu-border)] text-[var(--fu-text-muted)]",
                )}
              >
                + New Class
              </button>
            )}
          </div>
        </div>

        {newClassPick && (
          <select
            value={targetClassId ?? ""}
            onChange={(e) => {
              setTargetClassId(e.target.value || null);
              setChosenSkill("");
            }}
            className="mt-4 w-full rounded-md border border-[var(--fu-border)] bg-[var(--fu-bg-elevated)] p-3 text-base text-[var(--fu-text)] focus:border-[var(--fu-gold)] focus:outline-none"
          >
            <option value="">Choose a Class…</option>
            {classes
              .filter((c) => !existingClassIds.includes(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        )}

        {targetClass && (
          <>
            {isNewClass && targetClass.freeBenefits.length > 0 && (
              <ul className="mt-4 space-y-1 text-base text-[var(--fu-cyan)]">
                {targetClass.freeBenefits.map((b, i) => (
                  <li key={i}>+ {b.text}</li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <span className="fu-label text-sm text-[var(--fu-text-muted)]">Choose a Skill</span>
              <select
                value={chosenSkill}
                onChange={(e) => setChosenSkill(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-[var(--fu-border)] bg-[var(--fu-bg-elevated)] p-3 text-base text-[var(--fu-text)] focus:border-[var(--fu-gold)] focus:outline-none"
              >
                <option value="">Choose…</option>
                {availableSkills.map((sk) => (
                  <option key={sk.name} value={sk.name}>
                    {sk.name}
                    {sk.maxLevel > 1 ? ` (◇${sk.maxLevel})` : ""}
                  </option>
                ))}
              </select>
              {chosenSkill &&
                (() => {
                  const sk = targetClass.skills.find((s) => s.name === chosenSkill);
                  return sk ? (
                    <SkillText
                      text={sk.text}
                      skillLevel={countTaken(existingSkillsTaken, chosenSkill) + 1}
                      className="mt-2 text-base text-[var(--fu-text-muted)]"
                    />
                  ) : null;
                })()}
            </div>
          </>
        )}

        {previewStats && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["HP", currentStats.hp.value, previewStats.hp.value],
                ["MP", currentStats.mp.value, previewStats.mp.value],
                ["IP", currentStats.ip.value, previewStats.ip.value],
                ["Crisis", currentStats.crisis.value, previewStats.crisis.value],
              ] as const
            ).map(([label, before, after]) => (
              <div key={label} className="fu-panel p-3 text-center">
                <div className="fu-label text-sm text-[var(--fu-text-muted)]">{label}</div>
                <div className="fu-heading text-lg font-bold text-[var(--fu-text)]">
                  {before}{" "}
                  {after !== before && <span className="text-[var(--fu-success)]">→ {after}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="fu-label rounded-md border border-[var(--fu-border)] px-5 py-2.5 text-sm text-[var(--fu-text-muted)] hover:text-[var(--fu-text)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!previewCharacter}
            onClick={handleApply}
            className="fu-label rounded-md bg-[var(--fu-gold-deep)] px-5 py-2.5 text-sm font-bold text-[var(--fu-text-onwood)] disabled:opacity-30"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
