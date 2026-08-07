"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { classesById } from "../../data/classes";
import { findEquipmentItem, calcDerivedStats } from "../../lib/derivedStats";
import type { FUCharacter } from "../../lib/types";
import { SkillText } from "../shared/SkillText";
import { StatBar } from "./StatBar";

function useChangeFlash(value: number): boolean {
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 550);
      return () => clearTimeout(t);
    }
  }, [value]);
  return flash;
}

function StatTile({ label, value }: { label: string; value: number }) {
  const flash = useChangeFlash(value);
  return (
    <div className="fu-panel p-3 text-center">
      <div className="fu-label text-[9px] text-[var(--fu-text-muted)]">{label}</div>
      <div className={cn("fu-heading text-xl font-bold text-[var(--fu-gold-bright)]", flash && "fu-stat-changed")}>
        {value}
      </div>
    </div>
  );
}

export function CharacterSheet({ character, onLevelUp }: { character: FUCharacter; onLevelUp: () => void }) {
  const classes = character.classLevels
    .map((cl) => classesById[cl.classId])
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const stats = calcDerivedStats(character.attributes, character.equipment, classes);

  const equippedWeapons = character.equipment.weapons.map((id) => findEquipmentItem(id)).filter(Boolean);
  const equippedShield = character.equipment.shield ? findEquipmentItem(character.equipment.shield) : undefined;
  const equippedArmor = character.equipment.armor ? findEquipmentItem(character.equipment.armor) : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <Link href="/FU" className="fu-label text-[10px] text-[var(--fu-text-muted)] hover:text-[var(--fu-text)]">
          ← Roster
        </Link>
        <button
          type="button"
          onClick={onLevelUp}
          className="fu-label rounded-md bg-[var(--fu-gold)] px-4 py-2 text-xs font-bold text-[var(--fu-bg)] transition-opacity hover:opacity-90"
        >
          Level Up
        </button>
      </div>

      <header className="fu-panel p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="fu-heading text-3xl font-extrabold text-[var(--fu-gold-bright)]">
            {character.name || "Unnamed Hero"}
          </h1>
          <span className="fu-label rounded-full border border-[var(--fu-gold)]/50 px-3 py-1 text-xs text-[var(--fu-gold)]">
            LV {character.level}
          </span>
        </div>
        {character.pronouns && <p className="mt-0.5 text-xs text-[var(--fu-text-muted)]">{character.pronouns}</p>}
        <p className="mt-3 text-sm text-[var(--fu-text)]">
          <span className="fu-label text-[var(--fu-cyan)]">Identity </span>
          {character.identity}
        </p>
        <p className="mt-1 text-sm text-[var(--fu-text)]">
          <span className="fu-label text-[var(--fu-cyan)]">Theme </span>
          {character.theme}
        </p>
        <p className="mt-1 text-sm text-[var(--fu-text)]">
          <span className="fu-label text-[var(--fu-cyan)]">Origin </span>
          {character.origin}
        </p>
        {character.appearance && (
          <p className="mt-3 text-sm italic leading-relaxed text-[var(--fu-text-muted)]">{character.appearance}</p>
        )}
      </header>

      <section className="fu-panel space-y-3 p-5">
        <StatBar label="Hit Points" value={stats.hp.value} max={stats.hp.value} colorVar="--fu-success" markerAt={stats.crisis.value} />
        <StatBar label="Mind Points" value={stats.mp.value} max={stats.mp.value} colorVar="--fu-cyan" />
        <StatBar label="Inventory Points" value={stats.ip.value} max={stats.ip.value} colorVar="--fu-gold" />
        <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
          <StatTile label="Defense" value={stats.defense.value} />
          <StatTile label="M. Defense" value={stats.magicDefense.value} />
          <StatTile label="Initiative" value={stats.initiative.value} />
          <StatTile label="Fabula Pts" value={character.fabulaPoints} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="fu-heading text-lg font-bold text-[var(--fu-gold-bright)]">Classes &amp; Skills</h2>
        {character.classLevels.map((cl) => {
          const cls = classesById[cl.classId];
          if (!cls) return null;
          const counts = new Map<string, number>();
          for (const name of cl.skillsTaken) counts.set(name, (counts.get(name) ?? 0) + 1);
          return (
            <div key={cl.classId} className="fu-panel p-4">
              <div className="flex items-baseline justify-between">
                <span className="fu-heading text-base font-bold text-[var(--fu-text)]">{cls.name}</span>
                <span className="fu-label text-[10px] text-[var(--fu-gold)]">Lv {cl.levels}</span>
              </div>
              <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--fu-text-muted)]">
                {cls.freeBenefits.map((b, i) => (
                  <li key={i}>· {b.text}</li>
                ))}
              </ul>
              <div className="mt-3 space-y-2">
                {Array.from(counts.entries()).map(([name, count]) => {
                  const skill = cls.skills.find((s) => s.name === name);
                  if (!skill) return null;
                  return (
                    <div key={name} className="rounded border border-[var(--fu-border)] p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--fu-text)]">{skill.name}</span>
                        {skill.maxLevel > 1 && (
                          <span className="fu-label text-[10px] text-[var(--fu-cyan)]">
                            SL {count}/{skill.maxLevel}
                          </span>
                        )}
                      </div>
                      <SkillText text={skill.text} skillLevel={count} className="mt-1 text-[11px] text-[var(--fu-text-muted)]" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="fu-panel p-5">
        <h2 className="fu-heading text-lg font-bold text-[var(--fu-gold-bright)]">Equipment</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {equippedWeapons.map(
            (w) =>
              w && (
                <div key={w.id} className="rounded border border-[var(--fu-border)] p-2 text-sm">
                  <div className="font-semibold text-[var(--fu-text)]">{w.name}</div>
                  {"accuracy" in w && <div className="text-xs text-[var(--fu-cyan)]">{w.accuracy} → {w.damage}</div>}
                </div>
              ),
          )}
          {equippedShield && (
            <div className="rounded border border-[var(--fu-border)] p-2 text-sm">
              <div className="font-semibold text-[var(--fu-text)]">{equippedShield.name}</div>
              {"defenseBonus" in equippedShield && (
                <div className="text-xs text-[var(--fu-cyan)]">
                  Def +{equippedShield.defenseBonus} · M.Def +{equippedShield.magicDefenseBonus}
                </div>
              )}
            </div>
          )}
          {equippedArmor && (
            <div className="rounded border border-[var(--fu-border)] p-2 text-sm">
              <div className="font-semibold text-[var(--fu-text)]">{equippedArmor.name}</div>
            </div>
          )}
          {equippedWeapons.length === 0 && !equippedShield && !equippedArmor && (
            <p className="text-sm text-[var(--fu-text-muted)]">No equipment.</p>
          )}
        </div>
        <p className="fu-label mt-3 text-xs text-[var(--fu-gold-bright)]">{character.zenit} z</p>
      </section>
    </div>
  );
}
