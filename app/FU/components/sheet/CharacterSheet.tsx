"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { classesById } from "../../data/classes";
import { bondEmotionsById, bondPairings, bondsRulesNote, MAX_BONDS, type BondEmotionId } from "../../data/bonds";
import { actions, fabulaPointGains, fabulaPointUses, fabulaPointsNote } from "../../data/reference";
import { statusEffects, statusEffectRulesNote, type AttributeKey } from "../../data/statusEffects";
import { calcDerivedStats, currentAttributes, findEquipmentItem } from "../../lib/derivedStats";
import type { FUBond, FUCharacter, FUCharacterAttributes } from "../../lib/types";
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
    <div className="fu-panel p-4 text-center">
      <div className="fu-label text-sm text-[var(--fu-text-muted)]">{label}</div>
      <div className={cn("fu-heading text-3xl font-bold text-[var(--fu-gold-bright)]", flash && "fu-stat-changed")}>
        {value}
      </div>
    </div>
  );
}

/** Every sheet section follows the same shape: title sits outside (on the
 * wood background), only the section's actual content sits inside the
 * parchment card. */
function SheetSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="fu-heading text-2xl font-bold text-[var(--fu-gold-glow-bright)]">{title}</h2>
        {action}
      </div>
      <div className="fu-panel p-6">{children}</div>
    </section>
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
    <SheetSection title="Attributes &amp; Status Effects">
      <div className="grid gap-2.5">
        {ATTRIBUTE_ROWS.map(({ key, label }) => {
          const base = character.attributes[key];
          const curr = current[key];
          const reduced = curr !== base;
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded border border-[var(--fu-border)] px-4 py-2.5"
            >
              <span className="text-base font-semibold text-[var(--fu-text)]">{label}</span>
              <span className="fu-label text-base">
                <span className={reduced ? "text-[var(--fu-text-muted)] line-through" : "text-[var(--fu-gold-bright)]"}>
                  d{base}
                </span>
                {reduced && <span className="ml-1.5 text-[var(--fu-danger)]">d{curr}</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {statusEffects.map((effect) => {
          const active = character.statusEffects.includes(effect.id);
          return (
            <div
              key={effect.id}
              className={cn(
                "flex items-center gap-2 rounded border px-3 py-2.5 text-sm",
                active ? "border-[var(--fu-danger)] bg-[var(--fu-danger)]/10" : "border-[var(--fu-border)]",
              )}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleEffect(effect.id)}
                  className="h-4 w-4 accent-[var(--fu-danger)]"
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
      <p className="mt-4 text-sm leading-relaxed text-[var(--fu-text-muted)]">{statusEffectRulesNote}</p>
    </SheetSection>
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
    <SheetSection title="Fabula Points">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => adjust(-1)}
          aria-label="Spend a Fabula Point"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--fu-border)] text-2xl leading-none text-[var(--fu-text)] hover:border-[var(--fu-gold)]"
        >
          −
        </button>
        <span className="fu-heading w-12 text-center text-4xl font-bold text-[var(--fu-gold-bright)]">
          {character.fabulaPoints}
        </span>
        <button
          type="button"
          onClick={() => adjust(1)}
          aria-label="Gain a Fabula Point"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--fu-border)] text-2xl leading-none text-[var(--fu-text)] hover:border-[var(--fu-gold)]"
        >
          +
        </button>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="fu-label text-sm text-[var(--fu-text-muted)]">Gain a point when…</p>
          <ul className="mt-1.5 space-y-1.5 text-base leading-snug text-[var(--fu-text)]">
            {fabulaPointGains.map((g, i) => (
              <li key={i}>· {g}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="fu-label text-sm text-[var(--fu-text-muted)]">Spend a point to…</p>
          <ul className="mt-1.5 space-y-1.5 text-base leading-snug text-[var(--fu-text)]">
            {fabulaPointUses.map((u, i) => (
              <li key={i}>· {u}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--fu-text-muted)]">{fabulaPointsNote}</p>
    </SheetSection>
  );
}

function BondEditor({
  bond,
  onChange,
  onRemove,
}: {
  bond: FUBond;
  onChange: (bond: FUBond) => void;
  onRemove: () => void;
}) {
  function toggle(pair: [BondEmotionId, BondEmotionId], emotionId: BondEmotionId) {
    const [a, b] = pair;
    const isActive = bond.emotions.includes(emotionId);
    const withoutPair = bond.emotions.filter((e) => e !== a && e !== b);
    onChange({ ...bond, emotions: isActive ? withoutPair : [...withoutPair, emotionId] });
  }

  return (
    <div className="rounded border border-[var(--fu-border)] p-4">
      <div className="flex items-center gap-3">
        <input
          value={bond.name}
          onChange={(e) => onChange({ ...bond, name: e.target.value })}
          placeholder="Who or what is this Bond with?"
          className="flex-1 rounded border border-[var(--fu-border)] bg-[var(--fu-bg-elevated)] px-3 py-2 text-base text-[var(--fu-text)] placeholder:text-[var(--fu-text-muted)]/50 focus:border-[var(--fu-gold)] focus:outline-none"
        />
        <span className="fu-label whitespace-nowrap text-sm text-[var(--fu-gold-bright)]">
          Strength {bond.emotions.length}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove Bond"
          className="text-[var(--fu-text-muted)] hover:text-[var(--fu-danger)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {bondPairings.map((pair) => (
          <div key={pair.join("-")} className="flex gap-2">
            {pair.map((emotionId) => {
              const emotion = bondEmotionsById[emotionId];
              const active = bond.emotions.includes(emotionId);
              return (
                <button
                  key={emotionId}
                  type="button"
                  onClick={() => toggle(pair, emotionId)}
                  className={cn(
                    "flex-1 rounded border px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "border-[var(--fu-gold)] bg-[var(--fu-gold)]/10 font-semibold text-[var(--fu-gold-bright)]"
                      : "border-[var(--fu-border)] text-[var(--fu-text-muted)] hover:border-[var(--fu-border-bright)]",
                  )}
                >
                  {emotion.name}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function BondsPanel({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  function updateBond(index: number, bond: FUBond) {
    const next = character.bonds.map((b, i) => (i === index ? bond : b));
    onUpdate({ ...character, bonds: next, updatedAt: new Date().toISOString() });
  }
  function removeBond(index: number) {
    onUpdate({
      ...character,
      bonds: character.bonds.filter((_, i) => i !== index),
      updatedAt: new Date().toISOString(),
    });
  }
  function addBond() {
    if (character.bonds.length >= MAX_BONDS) return;
    onUpdate({
      ...character,
      bonds: [...character.bonds, { name: "", emotions: [] }],
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <SheetSection
      title="Bonds"
      action={
        <button
          type="button"
          onClick={addBond}
          disabled={character.bonds.length >= MAX_BONDS}
          className="fu-label rounded-md border border-[var(--fu-gold-glow)]/50 px-3 py-1.5 text-sm text-[var(--fu-gold-glow)] transition-colors hover:bg-[var(--fu-gold-glow)]/10 disabled:opacity-30"
        >
          + Add Bond ({character.bonds.length}/{MAX_BONDS})
        </button>
      }
    >
      {character.bonds.length === 0 ? (
        <p className="text-base text-[var(--fu-text-muted)]">
          No Bonds yet — these usually form during resting scenes as your story unfolds.
        </p>
      ) : (
        <div className="space-y-3">
          {character.bonds.map((bond, i) => (
            <BondEditor key={i} bond={bond} onChange={(b) => updateBond(i, b)} onRemove={() => removeBond(i)} />
          ))}
        </div>
      )}
      <p className="mt-4 text-sm leading-relaxed text-[var(--fu-text-muted)]">{bondsRulesNote}</p>
    </SheetSection>
  );
}

function QuickReferenceSection() {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fu-heading mb-3 flex w-full items-center justify-between gap-2 text-2xl font-bold text-[var(--fu-gold-glow-bright)]"
      >
        Quick Reference
        <span className="fu-label text-sm text-[var(--fu-text-onwood-muted)]">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="fu-panel grid gap-8 p-6 lg:grid-cols-2">
          <div>
            <h3 className="fu-label text-base text-[var(--fu-cyan)]">Actions</h3>
            <dl className="mt-3 space-y-3">
              {actions.map((a) => (
                <div key={a.name}>
                  <dt className="text-lg font-semibold text-[var(--fu-text)]">{a.name}</dt>
                  <dd className="text-base leading-snug text-[var(--fu-text-muted)]">{a.description}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="fu-label text-base text-[var(--fu-cyan)]">Status Effects</h3>
            <dl className="mt-3 space-y-3">
              {statusEffects.map((e) => (
                <div key={e.id}>
                  <dt className="text-lg font-semibold text-[var(--fu-text)]">{e.name}</dt>
                  <dd className="text-base leading-snug text-[var(--fu-text-muted)]">{e.description}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-[var(--fu-text-muted)]">{statusEffectRulesNote}</p>
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <Link
          href="/FU"
          className="fu-label text-sm text-[var(--fu-text-onwood-muted)] hover:text-[var(--fu-text-onwood)]"
        >
          ← Roster
        </Link>
        <button
          type="button"
          onClick={onLevelUp}
          className="fu-label rounded-md bg-[var(--fu-gold-glow)] px-5 py-2.5 text-sm font-bold text-[var(--fu-bg)] transition-opacity hover:opacity-90"
        >
          Level Up
        </button>
      </div>

      <header className="fu-panel p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="fu-heading text-4xl font-extrabold text-[var(--fu-gold-bright)] lg:text-5xl">
            {character.name || "Unnamed Hero"}
          </h1>
          <span className="fu-label rounded-full border border-[var(--fu-gold)]/50 px-4 py-1.5 text-sm text-[var(--fu-gold)]">
            LV {character.level}
          </span>
        </div>
        {character.pronouns && <p className="mt-1 text-sm text-[var(--fu-text-muted)]">{character.pronouns}</p>}
        <div className="mt-4 grid gap-1 sm:grid-cols-3">
          <p className="text-base text-[var(--fu-text)]">
            <span className="fu-label text-[var(--fu-cyan)]">Identity </span>
            {character.identity}
          </p>
          <p className="text-base text-[var(--fu-text)]">
            <span className="fu-label text-[var(--fu-cyan)]">Theme </span>
            {character.theme}
          </p>
          <p className="text-base text-[var(--fu-text)]">
            <span className="fu-label text-[var(--fu-cyan)]">Origin </span>
            {character.origin}
          </p>
        </div>
        {character.appearance && (
          <p className="mt-4 text-base italic leading-relaxed text-[var(--fu-text-muted)]">{character.appearance}</p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:col-span-5">
          <AttributesAndStatusPanel character={character} current={current} onUpdate={onUpdate} />

          <SheetSection title="Vitals">
            <div className="space-y-4">
              <StatBar
                label="Hit Points"
                value={stats.hp.value}
                max={stats.hp.value}
                colorVar="--fu-success"
                markerAt={stats.crisis.value}
              />
              <StatBar label="Mind Points" value={stats.mp.value} max={stats.mp.value} colorVar="--fu-cyan" />
              <StatBar label="Inventory Points" value={stats.ip.value} max={stats.ip.value} colorVar="--fu-gold" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <StatTile label="Crisis" value={stats.crisis.value} />
                <StatTile label="Defense" value={stats.defense.value} />
                <StatTile label="M. Defense" value={stats.magicDefense.value} />
                <StatTile label="Initiative" value={stats.initiative.value} />
              </div>
              <p className="fu-label text-sm text-[var(--fu-text-muted)]">
                Crisis: half your max HP, rounded down — the point at which you gain access to Crisis benefits.
              </p>
            </div>
          </SheetSection>

          <FabulaPointsPanel character={character} onUpdate={onUpdate} />

          <BondsPanel character={character} onUpdate={onUpdate} />
        </div>

        <div className="space-y-6 lg:col-span-7">
          <section>
            <h2 className="fu-heading mb-3 text-2xl font-bold text-[var(--fu-gold-glow-bright)]">Classes &amp; Skills</h2>
            <div className={cn("grid gap-4", character.classLevels.length > 1 && "xl:grid-cols-2")}>
              {character.classLevels.map((cl) => {
                const cls = classesById[cl.classId];
                if (!cls) return null;
                const counts = new Map<string, number>();
                for (const name of cl.skillsTaken) counts.set(name, (counts.get(name) ?? 0) + 1);
                return (
                  <div key={cl.classId}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="fu-heading text-xl font-bold text-[var(--fu-gold-glow-bright)]">{cls.name}</span>
                      <span className="fu-label text-sm text-[var(--fu-gold-glow)]">Lv {cl.levels}</span>
                    </div>
                    <div className="fu-panel p-5">
                      <ul className="space-y-1 text-base text-[var(--fu-text-muted)]">
                        {cls.freeBenefits.map((b, i) => (
                          <li key={i}>· {b.text}</li>
                        ))}
                      </ul>
                      <div className="mt-4 space-y-3">
                        {Array.from(counts.entries()).map(([name, count]) => {
                          const skill = cls.skills.find((s) => s.name === name);
                          if (!skill) return null;
                          return (
                            <div key={name} className="rounded border border-[var(--fu-border)] p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-semibold text-[var(--fu-text)]">{skill.name}</span>
                                {skill.maxLevel > 1 && (
                                  <span className="fu-label text-sm text-[var(--fu-cyan)]">
                                    SL {count}/{skill.maxLevel}
                                  </span>
                                )}
                              </div>
                              <SkillText
                                text={skill.text}
                                skillLevel={count}
                                className="mt-1.5 text-base leading-snug text-[var(--fu-text-muted)]"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <SheetSection title="Equipment">
            <div className="grid gap-3 sm:grid-cols-2">
              {equippedWeapons.map(
                (w) =>
                  w && (
                    <div key={w.id} className="rounded border border-[var(--fu-border)] p-3 text-base">
                      <div className="font-semibold text-[var(--fu-text)]">{w.name}</div>
                      {"accuracy" in w && (
                        <div className="text-sm text-[var(--fu-cyan)]">
                          {w.accuracy} → {w.damage}
                        </div>
                      )}
                    </div>
                  ),
              )}
              {equippedShield && (
                <div className="rounded border border-[var(--fu-border)] p-3 text-base">
                  <div className="font-semibold text-[var(--fu-text)]">{equippedShield.name}</div>
                  {"defenseBonus" in equippedShield && (
                    <div className="text-sm text-[var(--fu-cyan)]">
                      Def +{equippedShield.defenseBonus} · M.Def +{equippedShield.magicDefenseBonus}
                    </div>
                  )}
                </div>
              )}
              {equippedArmor && (
                <div className="rounded border border-[var(--fu-border)] p-3 text-base">
                  <div className="font-semibold text-[var(--fu-text)]">{equippedArmor.name}</div>
                </div>
              )}
              {equippedWeapons.length === 0 && !equippedShield && !equippedArmor && (
                <p className="text-base text-[var(--fu-text-muted)]">No equipment.</p>
              )}
            </div>
            <p className="fu-label mt-4 text-base text-[var(--fu-gold-bright)]">{character.zenit} z</p>
          </SheetSection>

          <QuickReferenceSection />
        </div>
      </div>
    </div>
  );
}
