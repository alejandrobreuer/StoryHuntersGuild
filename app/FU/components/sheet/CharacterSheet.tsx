"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { classesById } from "../../data/classes";
import { actions, fabulaPointGains, fabulaPointUses, fabulaPointsNote } from "../../data/reference";
import { statusEffects, statusEffectRulesNote, type AttributeKey } from "../../data/statusEffects";
import { calcDerivedStats, currentAttributes, findEquipmentItem } from "../../lib/derivedStats";
import type { FUCharacter, FUCharacterAttributes } from "../../lib/types";
import { InfoDisclosure } from "../shared/InfoDisclosure";
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

const ATTRIBUTE_ROWS: { key: AttributeKey; label: string }[] = [
  { key: "dexterity", label: "Dexterity" },
  { key: "insight", label: "Insight" },
  { key: "might", label: "Might" },
  { key: "willpower", label: "Willpower" },
];

function AttributesAndStatusPanel({
  character,
  current,
  onUpdate,
}: {
  character: FUCharacter;
  current: FUCharacterAttributes;
  onUpdate: (updated: FUCharacter) => void;
}) {
  function toggleEffect(id: string) {
    const active = character.statusEffects.includes(id);
    const next = active ? character.statusEffects.filter((e) => e !== id) : [...character.statusEffects, id];
    onUpdate({ ...character, statusEffects: next, updatedAt: new Date().toISOString() });
  }

  return (
    <section className="fu-panel p-5">
      <h2 className="fu-heading text-lg font-bold text-[var(--fu-gold-bright)]">Attributes &amp; Status Effects</h2>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ATTRIBUTE_ROWS.map(({ key, label }) => {
          const base = character.attributes[key];
          const curr = current[key];
          const reduced = curr !== base;
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded border border-[var(--fu-border)] px-3 py-2"
            >
              <span className="text-sm font-semibold text-[var(--fu-text)]">{label}</span>
              <span className="fu-label text-sm">
                <span className={reduced ? "text-[var(--fu-text-muted)] line-through" : "text-[var(--fu-gold-bright)]"}>
                  d{base}
                </span>
                {reduced && <span className="ml-1.5 text-[var(--fu-danger)]">d{curr}</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {statusEffects.map((effect) => {
          const active = character.statusEffects.includes(effect.id);
          return (
            <div
              key={effect.id}
              className={cn(
                "flex items-center gap-1.5 rounded border px-2 py-1.5 text-xs",
                active ? "border-[var(--fu-danger)] bg-[var(--fu-danger)]/10" : "border-[var(--fu-border)]",
              )}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleEffect(effect.id)}
                  className="accent-[var(--fu-danger)]"
                />
                <span className={active ? "font-semibold text-[var(--fu-danger)]" : "text-[var(--fu-text)]"}>
                  {effect.name}
                </span>
              </label>
              <InfoDisclosure label={`What ${effect.name} does`}>{effect.description}</InfoDisclosure>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-[var(--fu-text-muted)]">{statusEffectRulesNote}</p>
    </section>
  );
}

function FabulaPointsPanel({
  character,
  onUpdate,
}: {
  character: FUCharacter;
  onUpdate: (updated: FUCharacter) => void;
}) {
  function adjust(delta: number) {
    onUpdate({
      ...character,
      fabulaPoints: Math.max(0, character.fabulaPoints + delta),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="fu-panel p-5">
      <h2 className="fu-heading text-lg font-bold text-[var(--fu-gold-bright)]">Fabula Points</h2>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => adjust(-1)}
          aria-label="Spend a Fabula Point"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--fu-border)] text-lg leading-none text-[var(--fu-text)] hover:border-[var(--fu-gold)]"
        >
          −
        </button>
        <span className="fu-heading w-10 text-center text-2xl font-bold text-[var(--fu-gold-bright)]">
          {character.fabulaPoints}
        </span>
        <button
          type="button"
          onClick={() => adjust(1)}
          aria-label="Gain a Fabula Point"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--fu-border)] text-lg leading-none text-[var(--fu-text)] hover:border-[var(--fu-gold)]"
        >
          +
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="fu-label text-[10px] text-[var(--fu-text-muted)]">Gain a point when…</p>
          <ul className="mt-1 space-y-1 text-[11px] leading-snug text-[var(--fu-text)]">
            {fabulaPointGains.map((g, i) => (
              <li key={i}>· {g}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="fu-label text-[10px] text-[var(--fu-text-muted)]">Spend a point to…</p>
          <ul className="mt-1 space-y-1 text-[11px] leading-snug text-[var(--fu-text)]">
            {fabulaPointUses.map((u, i) => (
              <li key={i}>· {u}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-[var(--fu-text-muted)]">{fabulaPointsNote}</p>
    </section>
  );
}

function QuickReferenceSection() {
  const [open, setOpen] = useState(false);
  return (
    <section className="fu-panel p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fu-heading flex w-full items-center justify-between text-lg font-bold text-[var(--fu-gold-bright)]"
      >
        Quick Reference
        <span className="fu-label text-[10px] text-[var(--fu-text-muted)]">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="fu-label text-xs text-[var(--fu-cyan)]">Actions</h3>
            <dl className="mt-2 space-y-2">
              {actions.map((a) => (
                <div key={a.name}>
                  <dt className="text-sm font-semibold text-[var(--fu-text)]">{a.name}</dt>
                  <dd className="text-[11px] leading-snug text-[var(--fu-text-muted)]">{a.description}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="fu-label text-xs text-[var(--fu-cyan)]">Status Effects</h3>
            <dl className="mt-2 space-y-2">
              {statusEffects.map((e) => (
                <div key={e.id}>
                  <dt className="text-sm font-semibold text-[var(--fu-text)]">{e.name}</dt>
                  <dd className="text-[11px] leading-snug text-[var(--fu-text-muted)]">{e.description}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--fu-text-muted)]">{statusEffectRulesNote}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function CharacterSheet({
  character,
  onLevelUp,
  onUpdate,
}: {
  character: FUCharacter;
  onLevelUp: () => void;
  onUpdate: (updated: FUCharacter) => void;
}) {
  const classes = character.classLevels
    .map((cl) => classesById[cl.classId])
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const current = currentAttributes(character.attributes, character.statusEffects);
  const stats = calcDerivedStats(character.attributes, character.equipment, classes, character.statusEffects);

  const equippedWeapons = character.equipment.weapons.map((id) => findEquipmentItem(id)).filter(Boolean);
  const equippedShield = character.equipment.shield ? findEquipmentItem(character.equipment.shield) : undefined;
  const equippedArmor = character.equipment.armor ? findEquipmentItem(character.equipment.armor) : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <Link
          href="/FU"
          className="fu-label text-[10px] text-[var(--fu-text-onwood-muted)] hover:text-[var(--fu-text-onwood)]"
        >
          ← Roster
        </Link>
        <button
          type="button"
          onClick={onLevelUp}
          className="fu-label rounded-md bg-[var(--fu-gold-glow)] px-4 py-2 text-xs font-bold text-[var(--fu-bg)] transition-opacity hover:opacity-90"
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

      <AttributesAndStatusPanel character={character} current={current} onUpdate={onUpdate} />

      <section className="fu-panel space-y-3 p-5">
        <StatBar
          label="Hit Points"
          value={stats.hp.value}
          max={stats.hp.value}
          colorVar="--fu-success"
          markerAt={stats.crisis.value}
        />
        <StatBar label="Mind Points" value={stats.mp.value} max={stats.mp.value} colorVar="--fu-cyan" />
        <StatBar label="Inventory Points" value={stats.ip.value} max={stats.ip.value} colorVar="--fu-gold" />
        <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
          <StatTile label="Crisis" value={stats.crisis.value} />
          <StatTile label="Defense" value={stats.defense.value} />
          <StatTile label="M. Defense" value={stats.magicDefense.value} />
          <StatTile label="Initiative" value={stats.initiative.value} />
        </div>
        <p className="fu-label text-[9px] text-[var(--fu-text-muted)]">
          Crisis: half your max HP, rounded down — the point at which you gain access to Crisis benefits.
        </p>
      </section>

      <FabulaPointsPanel character={character} onUpdate={onUpdate} />

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

      <QuickReferenceSection />
    </div>
  );
}
