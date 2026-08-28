"use client";

import * as React from "react";
import Link from "next/link";
import { User, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion } from "@/components/ui/Accordion";
import { bondEmotionsById, bondPairings, bondsRulesNote, MAX_BONDS, type BondEmotionId } from "@/app/FU/data/bonds";
import { actions, fabulaPointGains, fabulaPointUses, glossary } from "@/app/FU/data/reference";
import type { AttributeKey } from "@/app/FU/data/statusEffects";
import { elements, affinityStatusOrder, affinityStatusLabels, type AffinityStatus } from "@/app/FU/data/affinities";
import type { FUArmor, FUShield, FUWeapon, FUSpell } from "@/app/FU/data/types";
import {
  calcDerivedStats, currentAttributes, findEquipmentItem, calcSpent,
  XP_PER_LEVEL, MAX_CLASS_LEVEL, MAX_CLASSES,
} from "@/app/FU/lib/derivedStats";
import type { FUBond, FUCharacter, FUCharacterAttributes } from "@/app/FU/lib/types";
import { ReferenceDataProvider, useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import { InfoDisclosure } from "./InfoDisclosure";
import { SkillText } from "./SkillText";
import { StatBar } from "./StatBar";
import { CharacterFullBodyDrawer } from "./CharacterFullBodyDrawer";
import { toast } from "sonner";

// Spanish display labels for the canonical (English) inventory-item catalog
// — the DB stays in English to match the rulebook, only the visible label
// is translated here, same pattern as the PV/PM/PI/DES/PER/VIG/VOL labels
// below over their English rule concepts.
const IP_ITEM_LABELS: Record<string, string> = {
  remedy: "Remedio",
  elixir: "Elixir",
  tonic: "Tónico",
  "elemental-shard": "Fragmento elemental",
  "magic-tent": "Carpa mágica",
};

// Which classes grant permission to equip martial ("E") gear, per
// Reference/fabula_ultima_data_rules.txt — holding any level in one of these
// classes is enough, mastery isn't required.
const MARTIAL_MELEE_WEAPON_CLASSES = ["darkblade", "fury", "weaponmaster"];
const MARTIAL_RANGED_WEAPON_CLASSES = ["sharpshooter"];
const MARTIAL_ARMOR_CLASSES = ["darkblade", "fury", "guardian"];
const MARTIAL_SHIELD_CLASSES = ["guardian", "sharpshooter", "weaponmaster"];

function canEquipMartialWeapon(character: FUCharacter, weapon: FUWeapon): boolean {
  if (!weapon.martial) return true;
  const grantingClasses = weapon.range === "ranged" ? MARTIAL_RANGED_WEAPON_CLASSES : MARTIAL_MELEE_WEAPON_CLASSES;
  return character.classLevels.some((cl) => grantingClasses.includes(cl.classId));
}
function canEquipMartialArmor(character: FUCharacter, armor: FUArmor): boolean {
  return !armor.martial || character.classLevels.some((cl) => MARTIAL_ARMOR_CLASSES.includes(cl.classId));
}
function canEquipMartialShield(character: FUCharacter, shield: FUShield): boolean {
  return !shield.martial || character.classLevels.some((cl) => MARTIAL_SHIELD_CLASSES.includes(cl.classId));
}

// ─── small shared bits ───────────────────────────────────────────────────────

/** Always-visible titled panel — the non-collapsible sibling of Accordion, for the dashboard row (Vista General, Acciones, etc.) that should never hide its content. */
function Panel({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("surface-parchment p-3.5", className)}>
      <h3 className="font-label text-xs font-bold uppercase tracking-widest text-ink mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center rounded-sm border border-border px-2 py-2">
      <div className="font-label text-xs text-ink-light">{label}</div>
      <div className="font-label text-xl font-bold text-ink leading-tight">{value}</div>
    </div>
  );
}

/** Single-step +/- pair, no amount box — for XP, which only ever moves 1 at a time in play. */
function StepAdjuster({ onChange }: { onChange: (delta: number) => void }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button type="button" onClick={() => onChange(-1)} aria-label="Restar" className="flex size-7 items-center justify-center rounded-full border border-border text-sm leading-none text-ink hover:border-crimson hover:text-crimson">−</button>
      <button type="button" onClick={() => onChange(1)} aria-label="Sumar" className="flex size-7 items-center justify-center rounded-full border border-border text-sm leading-none text-ink hover:border-moss hover:text-moss">+</button>
    </div>
  );
}

/** Amount box + Add/Remove buttons — lets the player apply any delta to HP/MP/Zenit instead of stepping by 1. */
function AmountAdjuster({ onApply }: { onApply: (delta: number) => void }) {
  const [amount, setAmount] = React.useState("");

  function apply(sign: 1 | -1) {
    const n = Math.abs(Number(amount)) || 0;
    if (n > 0) onApply(sign * n);
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <input
        type="number"
        min={0}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0"
        className="w-12 border border-border bg-parchment/60 px-1 py-1 text-center text-xs text-ink focus:border-brass focus:outline-none font-body"
      />
      <button type="button" onClick={() => apply(-1)} aria-label="Restar" className="flex size-7 items-center justify-center rounded-full border border-border text-sm leading-none text-ink hover:border-crimson hover:text-crimson">−</button>
      <button type="button" onClick={() => apply(1)} aria-label="Sumar" className="flex size-7 items-center justify-center rounded-full border border-border text-sm leading-none text-ink hover:border-moss hover:text-moss">+</button>
    </div>
  );
}

function FabulaPointsPanel({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  function adjust(delta: number) {
    onUpdate({ ...character, fabulaPoints: Math.max(0, character.fabulaPoints + delta), updatedAt: new Date().toISOString() });
  }

  return (
    <Panel title="Puntos de Fábula">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex size-14 items-center justify-center rounded-full border-2 border-brass-light bg-crimson font-display text-2xl font-bold text-crimson-foreground">
            {character.fabulaPoints}
          </span>
          <AmountAdjuster onApply={adjust} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4 flex-1">
          <div>
            <p className="font-label text-2xs font-bold uppercase tracking-wide text-ink mb-1">Cómo conseguirlos</p>
            <ul className="space-y-1 text-xs text-ink-light font-body">
              {fabulaPointGains.map((g, i) => <li key={i}>· {g}</li>)}
            </ul>
          </div>
          <div>
            <p className="font-label text-2xs font-bold uppercase tracking-wide text-ink mb-1">Para qué usarlos</p>
            <ul className="space-y-1 text-xs text-ink-light font-body">
              {fabulaPointUses.map((u, i) => <li key={i}>· {u}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** One equip slot's display — an item name + unequip button, an empty "Vacío" placeholder, or a grayed-out note (the off hand when a two-handed weapon occupies both). */
function SlotDisplay({ label, itemName, note, onUnequip }: { label: string; itemName?: string; note?: string; onUnequip?: () => void }) {
  return (
    <div className={cn("rounded-sm border px-2 py-1.5", note ? "border-border/40 bg-parchment-dark/20 opacity-60" : "border-border")}>
      <div className="font-label text-2xs uppercase tracking-wide text-ink-light">{label}</div>
      {note ? (
        <p className="text-2xs italic text-ink-light font-body mt-0.5">{note}</p>
      ) : itemName ? (
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="font-body text-xs text-ink truncate">{itemName}</span>
          {onUnequip && <button type="button" onClick={onUnequip} className="font-label text-2xs uppercase text-leather-light hover:text-crimson shrink-0">Quitar</button>}
        </div>
      ) : (
        <p className="text-2xs text-ink-light font-body mt-0.5">Vacío</p>
      )}
    </div>
  );
}

/** Every held class's Free Benefit — the always-on passive bonuses from having levels in a class (as opposed to Skills, which are mostly active picks). */
function PassivesPanel({ character }: { character: FUCharacter }) {
  const ref = useReferenceDataContext();
  const rows: { className: string; text: string }[] = [];
  for (const cl of character.classLevels) {
    const cls = ref.classesById[cl.classId];
    if (!cls) continue;
    for (const benefit of cls.freeBenefits) rows.push({ className: cls.name, text: benefit.text });
  }

  return (
    <Panel title="Pasivos">
      {rows.length === 0 ? (
        <p className="text-sm text-ink-light font-body">Todavía sin clases.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="rounded-sm border border-border px-2.5 py-2">
              <span className="font-label text-2xs uppercase tracking-wide text-brass">{r.className}</span>
              <p className="mt-0.5 text-xs leading-snug text-ink font-body">{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

const ATTRIBUTE_ROWS: { key: AttributeKey; label: string }[] = [
  { key: "dexterity", label: "DES" },
  { key: "insight", label: "PER" },
  { key: "might", label: "VIG" },
  { key: "willpower", label: "VOL" },
];

function AttributeGrid({ character, current }: { character: FUCharacter; current: FUCharacterAttributes }) {
  const ref = useReferenceDataContext();
  return (
    <div className="grid grid-cols-4 gap-2">
      {ATTRIBUTE_ROWS.map(({ key, label }) => {
        const base = character.attributes[key];
        const curr = current[key];
        const reduced = curr !== base;
        const linked = ref.statusEffects.filter((e) => character.statusEffects.includes(e.id) && e.affects.includes(key));
        return (
          <div key={key} className={cn("text-center rounded-sm border px-2 py-2", reduced ? "border-crimson bg-crimson/5" : "border-border")}>
            <div className="font-label text-xs text-ink-light">{label}</div>
            <div className="font-label text-xl font-bold leading-tight">
              {reduced ? (
                <><span className="text-ink-light line-through text-xs mr-1">d{base}</span><span className="text-crimson">d{curr}</span></>
              ) : (
                <span className="text-ink">d{base}</span>
              )}
            </div>
            {linked.length > 0 && <div className="font-body text-2xs text-crimson truncate">{linked.map((e) => e.name).join("/")}</div>}
          </div>
        );
      })}
    </div>
  );
}

function EstadosPanel({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const ref = useReferenceDataContext();

  function toggleEffect(id: string) {
    const active = character.statusEffects.includes(id);
    const next = active ? character.statusEffects.filter((e) => e !== id) : [...character.statusEffects, id];
    onUpdate({ ...character, statusEffects: next, updatedAt: new Date().toISOString() });
  }

  return (
    <Panel title="Estados">
      <div className="flex flex-col gap-1">
        {ref.statusEffects.map((effect) => {
          const active = character.statusEffects.includes(effect.id);
          return (
            <button
              key={effect.id}
              type="button"
              onClick={() => toggleEffect(effect.id)}
              className={cn(
                "font-label text-2xs px-2 py-1.5 rounded-sm border text-left transition-colors",
                active ? "border-crimson bg-crimson/10 text-crimson font-semibold" : "border-border text-ink-light hover:border-crimson/50"
              )}
            >
              {effect.name}
            </button>
          );
        })}
      </div>
      <InfoDisclosure label="Qué hace cada estado">
        {ref.statusEffects.map((e) => <p key={e.id} className="mb-1.5 last:mb-0"><strong className="text-ink">{e.name}:</strong> {e.description}</p>)}
      </InfoDisclosure>
    </Panel>
  );
}

function AffinitiesAccordion({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const nonNormalCount = elements.filter((el) => (character.elementalAffinities[el.id] ?? "normal") !== "normal").length;

  function cycle(elementId: string) {
    const currentStatus = character.elementalAffinities[elementId] ?? "normal";
    const nextIndex = (affinityStatusOrder.indexOf(currentStatus) + 1) % affinityStatusOrder.length;
    onUpdate({
      ...character,
      elementalAffinities: { ...character.elementalAffinities, [elementId]: affinityStatusOrder[nextIndex] },
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <Accordion title="Afinidades" summary={nonNormalCount > 0 ? `${nonNormalCount} distinta(s)` : "Todas normales"}>
      <div className="grid grid-cols-2 gap-1.5">
        {elements.map((el) => {
          const status: AffinityStatus = character.elementalAffinities[el.id] ?? "normal";
          return (
            <button
              key={el.id}
              type="button"
              onClick={() => cycle(el.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-sm border px-2 py-1 text-left transition-colors",
                status === "normal" ? "border-border" : "border-brass bg-brass/10"
              )}
            >
              <span className="font-body text-xs text-ink">{el.name}</span>
              <span className="font-label text-2xs uppercase tracking-wide text-brass-bright">{affinityStatusLabels[status]}</span>
            </button>
          );
        })}
      </div>
    </Accordion>
  );
}

/** Static reference list — the 8 core conflict actions, same for every character (not skills or spells, which get their own panels). */
function ActionsReferencePanel() {
  return (
    <Panel title="Acciones">
      <div className="space-y-1.5">
        {actions.map((a) => (
          <div key={a.name} className="rounded-sm border border-border px-2.5 py-2">
            <span className="font-body text-sm font-semibold text-ink">{a.name}</span>
            <p className="mt-0.5 text-xs leading-snug text-ink-light font-body">{a.description}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SpellsPanel({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const ref = useReferenceDataContext();

  function spendMp(amount: number) {
    onUpdate({ ...character, currentMp: Math.max(0, character.currentMp - amount), updatedAt: new Date().toISOString() });
  }

  const rows: React.ReactNode[] = [];
  for (const cl of character.classLevels) {
    const cls = ref.classesById[cl.classId];
    if (cls?.subsystem?.type === "spells") {
      for (const spell of cls.subsystem.entries) {
        rows.push(<SpellRow key={`${cl.classId}-spell-${spell.name}`} spell={spell} currentMp={character.currentMp} onCast={spendMp} />);
      }
    }
  }

  return (
    <Panel title="Hechizos">
      {rows.length === 0 ? (
        <p className="text-sm text-ink-light font-body">Sin clase de lanzador de hechizos.</p>
      ) : (
        <div className="space-y-1.5">{rows}</div>
      )}
    </Panel>
  );
}

/**
 * Some spells have a fixed MP cost ("10"), others a formula that depends on
 * choices made when casting ("5 × T" — T = number of targets) — the input
 * pre-fills with the fixed cost when there is one (one click still works)
 * but stays editable either way, so a variable-cost spell is never stuck
 * with no way to actually spend MP for it (unlike the old "Costo variable"
 * text-only fallback).
 */
function SpellRow({ spell, currentMp, onCast }: { spell: FUSpell; currentMp: number; onCast: (mpCost: number) => void }) {
  const numericCost = Number(spell.mpCost);
  const fixed = Number.isFinite(numericCost) && numericCost > 0;
  const [cost, setCost] = React.useState(fixed ? String(numericCost) : "");

  return (
    <div className="rounded-sm border border-border px-2.5 py-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-body text-sm font-semibold text-ink">{spell.name} <span className="font-label text-2xs text-moss">{spell.mpCost} PM · {spell.target}</span></span>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min={0}
            max={currentMp}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="PM"
            className="w-14 border border-border bg-parchment/60 px-1.5 py-0.5 text-xs text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body"
          />
          <button
            type="button"
            onClick={() => { const n = Number(cost) || 0; if (n > 0) { onCast(n); if (!fixed) setCost(""); } }}
            className="font-label text-2xs uppercase tracking-wide border border-brass/50 px-2 py-0.5 text-brass hover:bg-brass/10 transition-colors"
          >
            Lanzar
          </button>
        </div>
      </div>
      <p className="mt-0.5 text-xs leading-snug text-ink-light font-body">{spell.text}</p>
    </div>
  );
}

/** Non-mastered classes count against the MAX_CLASSES cap; a mastered one (level 10) doesn't. */
function nonMasteredClassCount(character: FUCharacter): number {
  return character.classLevels.filter((cl) => cl.levels < MAX_CLASS_LEVEL).length;
}

function AddClassControl({ character, onAddClass }: { character: FUCharacter; onAddClass: (classId: string, skillName: string) => void }) {
  const ref = useReferenceDataContext();
  const heldIds = new Set(character.classLevels.map((cl) => cl.classId));
  const available = ref.classes.filter((c) => !heldIds.has(c.id));
  const atCap = nonMasteredClassCount(character) >= MAX_CLASSES;

  const [classId, setClassId] = React.useState("");
  const [skillName, setSkillName] = React.useState("");
  const cls = classId ? ref.classesById[classId] : undefined;

  if (atCap) {
    return (
      <p className="mt-3 pt-3 border-t border-border/60 text-2xs text-ink-light font-body">
        Ya tenés {MAX_CLASSES} clases sin masterizar — masterizá una (nivel {MAX_CLASS_LEVEL}) para poder sumar otra.
      </p>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/60 flex flex-col gap-1.5 sm:flex-row sm:items-end">
      <select value={classId} onChange={(e) => { setClassId(e.target.value); setSkillName(""); }} className="flex-1 border border-border bg-parchment/60 px-2 py-1 text-xs text-ink font-body">
        <option value="">Sumar una clase nueva…</option>
        {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={skillName} onChange={(e) => setSkillName(e.target.value)} disabled={!cls} className="flex-1 border border-border bg-parchment/60 px-2 py-1 text-xs text-ink font-body disabled:opacity-40">
        <option value="">Primera habilidad…</option>
        {cls?.skills.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
      </select>
      <button
        type="button"
        disabled={!classId || !skillName}
        onClick={() => { if (classId && skillName) { onAddClass(classId, skillName); setClassId(""); setSkillName(""); } }}
        className="font-label text-2xs uppercase tracking-wide border border-brass bg-brass/10 px-3 py-1 text-brass-bright hover:bg-brass/20 transition-colors disabled:opacity-30"
      >
        Sumar clase
      </button>
    </div>
  );
}

function ClassesAccordion({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const ref = useReferenceDataContext();

  function addClass(classId: string, skillName: string) {
    onUpdate({
      ...character,
      classLevels: [...character.classLevels, { classId, levels: 1, skillsTaken: [skillName] }],
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <Accordion title="Clases y habilidades" summary={`${character.classLevels.length} clase(s)`}>
      <div className="space-y-3">
        {character.classLevels.map((cl) => {
          const cls = ref.classesById[cl.classId];
          if (!cls) return null;
          const counts = new Map<string, number>();
          for (const name of cl.skillsTaken) counts.set(name, (counts.get(name) ?? 0) + 1);
          return (
            <div key={cl.classId}>
              <p className="font-body text-sm font-semibold text-ink">
                {cls.name} <span className="font-label text-2xs font-normal text-ink-light">Nv {cl.levels}{cl.levels >= MAX_CLASS_LEVEL && " (máx — masterizada)"} · libre: {cls.freeBenefits.map((b) => b.text).join(", ")}</span>
              </p>
              <p className="text-xs text-ink-light font-body mt-0.5">
                {Array.from(counts.entries()).map(([name, count], i) => {
                  const skill = cls.skills.find((s) => s.name === name);
                  const maxed = skill && count >= skill.maxLevel;
                  return (
                    <React.Fragment key={name}>
                      {i > 0 && ", "}
                      {name} ({count}{skill && skill.maxLevel > 1 ? `/${skill.maxLevel}` : ""}){maxed && <span className="text-brass font-semibold"> máx</span>}
                    </React.Fragment>
                  );
                })}
              </p>
            </div>
          );
        })}
      </div>
      <AddClassControl character={character} onAddClass={addClass} />
    </Accordion>
  );
}

/**
 * Mastering a class (reaching level MAX_CLASS_LEVEL) grants one free choice
 * of Heroic Skill, per Reference/fabula_ultima_data_rules.txt — modeled as a
 * derived "earned vs. spent" count (mastered-class count vs. heroicSkills
 * taken) rather than a one-time prompt at the exact level-up moment, so it
 * also works for characters that were already mastered before this existed.
 */
function HeroicSkillsAccordion({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const ref = useReferenceDataContext();
  const earned = character.classLevels.filter((cl) => cl.levels >= MAX_CLASS_LEVEL).length;
  const spent = character.heroicSkills.length;
  const available = earned - spent;

  const taken = character.heroicSkills.map((id) => ref.heroicSkills.find((h) => h.id === id)).filter((h): h is NonNullable<typeof h> => Boolean(h));
  const untaken = ref.heroicSkills.filter((h) => !character.heroicSkills.includes(h.id));

  const [pickId, setPickId] = React.useState("");
  const picked = ref.heroicSkills.find((h) => h.id === pickId);

  function take() {
    if (!pickId || available <= 0) return;
    onUpdate({ ...character, heroicSkills: [...character.heroicSkills, pickId], updatedAt: new Date().toISOString() });
    setPickId("");
  }

  return (
    <Accordion title="Habilidades Heroicas" summary={`${spent}/${earned} elegidas`}>
      {taken.length === 0 ? (
        <p className="text-sm text-ink-light font-body">Todavía no elegiste ninguna.</p>
      ) : (
        <div className="space-y-1.5">
          {taken.map((h) => (
            <div key={h.id} className="rounded-sm border border-border px-2.5 py-2">
              <span className="font-body text-sm font-semibold text-ink">{h.name}</span>
              <p className="mt-0.5 text-xs leading-snug text-ink-light font-body">{h.description}</p>
            </div>
          ))}
        </div>
      )}

      {available > 0 ? (
        <div className="mt-3 pt-3 border-t border-border/60 flex flex-col gap-1.5">
          <p className="font-label text-2xs uppercase tracking-wide text-brass-bright">
            {available} elección(es) disponible(s) — masterizaste {earned} clase(s)
          </p>
          <select value={pickId} onChange={(e) => setPickId(e.target.value)} className="border border-border bg-parchment/60 px-2 py-1 text-xs text-ink font-body">
            <option value="">Elegí una Habilidad Heroica…</option>
            {untaken.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          {picked && (
            <p className="text-2xs text-ink-light font-body">
              {picked.requirement ?? "Disponible para cualquiera que haya masterizado una clase."}
            </p>
          )}
          <button
            type="button"
            disabled={!pickId}
            onClick={take}
            className="self-start font-label text-2xs uppercase tracking-wide border border-brass bg-brass/10 px-3 py-1 text-brass-bright hover:bg-brass/20 transition-colors disabled:opacity-30"
          >
            Elegir
          </button>
        </div>
      ) : (
        <p className="mt-3 pt-3 border-t border-border/60 text-2xs text-ink-light font-body">
          Masterizá una clase (nivel {MAX_CLASS_LEVEL}) para ganar una elección de Habilidad Heroica.
        </p>
      )}
    </Accordion>
  );
}

function BondEditor({ bond, onChange, onRemove }: { bond: FUBond; onChange: (bond: FUBond) => void; onRemove: () => void }) {
  const [editing, setEditing] = React.useState(false);

  function toggle(pair: [BondEmotionId, BondEmotionId], emotionId: BondEmotionId) {
    const [a, b] = pair;
    const isActive = bond.emotions.includes(emotionId);
    const withoutPair = bond.emotions.filter((e) => e !== a && e !== b);
    onChange({ ...bond, emotions: isActive ? withoutPair : [...withoutPair, emotionId] });
  }

  return (
    <div className="border-t border-border/60 first:border-t-0 py-2 first:pt-0">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setEditing((o) => !o)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
          <span className="font-body text-sm font-semibold text-ink truncate">{bond.name || "Sin nombre"}</span>
          <span className="font-label text-2xs uppercase tracking-wide text-brass-bright shrink-0">Nv {bond.emotions.length}{bond.emotions.length >= 3 && " máx"}</span>
        </button>
        <button type="button" onClick={onRemove} aria-label="Quitar Vínculo" className="text-leather-light hover:text-crimson text-xs shrink-0">✕</button>
      </div>
      {!editing && bond.emotions.length > 0 && (
        <p className="text-2xs text-ink-light font-body mt-0.5">{bond.emotions.map((id) => bondEmotionsById[id].name).join(" · ")}</p>
      )}
      {editing && (
        <div className="mt-2 flex flex-col gap-2">
          <input
            value={bond.name}
            onChange={(e) => onChange({ ...bond, name: e.target.value })}
            placeholder="¿Con quién o qué es este Vínculo?"
            className="border border-border bg-parchment/60 px-2 py-1 text-xs text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body"
          />
          <div className="grid gap-1.5 sm:grid-cols-3">
            {bondPairings.map((pair) => (
              <div key={pair.join("-")} className="flex gap-1">
                {pair.map((emotionId) => {
                  const emotion = bondEmotionsById[emotionId];
                  const active = bond.emotions.includes(emotionId);
                  return (
                    <button
                      key={emotionId}
                      type="button"
                      onClick={() => toggle(pair, emotionId)}
                      className={cn(
                        "flex-1 border px-1.5 py-1 text-2xs font-body transition-colors",
                        active ? "border-brass bg-brass/10 font-semibold text-brass-bright" : "border-border text-ink-light hover:border-brass"
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
      )}
    </div>
  );
}

function BondsAccordion({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  function updateBond(index: number, bond: FUBond) {
    onUpdate({ ...character, bonds: character.bonds.map((b, i) => (i === index ? bond : b)), updatedAt: new Date().toISOString() });
  }
  function removeBond(index: number) {
    onUpdate({ ...character, bonds: character.bonds.filter((_, i) => i !== index), updatedAt: new Date().toISOString() });
  }
  function addBond() {
    if (character.bonds.length >= MAX_BONDS) return;
    onUpdate({ ...character, bonds: [...character.bonds, { name: "", emotions: [] }], updatedAt: new Date().toISOString() });
  }

  return (
    <Accordion title="Vínculos" summary={`${character.bonds.length}/${MAX_BONDS}`}>
      {character.bonds.length === 0 ? (
        <p className="text-sm text-ink-light font-body">Todavía no hay Vínculos.</p>
      ) : (
        <div>{character.bonds.map((bond, i) => <BondEditor key={i} bond={bond} onChange={(b) => updateBond(i, b)} onRemove={() => removeBond(i)} />)}</div>
      )}
      <button
        type="button"
        onClick={addBond}
        disabled={character.bonds.length >= MAX_BONDS}
        className="font-label mt-2 border border-brass/50 px-2 py-1 text-2xs uppercase tracking-wide text-brass transition-colors hover:bg-brass/10 disabled:opacity-30"
      >
        + Vínculo
      </button>
      <p className="mt-2 text-2xs leading-relaxed text-ink-light font-body">{bondsRulesNote}</p>
    </Accordion>
  );
}

function OtherItemsNote({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const [text, setText] = React.useState(character.otherItemsNote);
  const dirty = text !== character.otherItemsNote;

  return (
    <div className="mt-2 pt-2 border-t border-border/60">
      <label className="font-label text-2xs uppercase tracking-wide text-ink-light">Otros objetos de misión</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Objetos que el GM te haya indicado anotar"
        className="mt-1 w-full border border-border bg-parchment/60 px-2 py-1.5 text-xs text-ink focus:border-brass focus:outline-none font-body resize-none"
      />
      <button
        type="button"
        disabled={!dirty}
        onClick={() => onUpdate({ ...character, otherItemsNote: text, updatedAt: new Date().toISOString() })}
        className="mt-1 font-label text-2xs uppercase tracking-wide border border-brass/50 px-2 py-1 text-brass hover:bg-brass/10 transition-colors disabled:opacity-30"
      >
        Guardar
      </button>
    </div>
  );
}

function InventarioPanel({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const ref = useReferenceDataContext();
  const mainHandId = character.equipment.weapons[0];
  const mainHand = mainHandId ? findEquipmentItem(mainHandId, ref) : undefined;
  const isTwoHanded = mainHand && "handedness" in mainHand && mainHand.handedness === "two-handed";
  const offHandWeaponId = character.equipment.weapons[1];
  const offHandWeapon = offHandWeaponId ? findEquipmentItem(offHandWeaponId, ref) : undefined;
  const equippedShield = character.equipment.shield ? findEquipmentItem(character.equipment.shield, ref) : undefined;
  const offHandItem = offHandWeapon ?? equippedShield;
  const equippedArmor = character.equipment.armor ? findEquipmentItem(character.equipment.armor, ref) : undefined;
  const backpackItems = character.backpack.map((id) => ({ id, item: findEquipmentItem(id, ref) }));
  const spent = calcSpent(character.equipment, ref);

  const [shopId, setShopId] = React.useState("");

  function adjustZenit(delta: number) {
    onUpdate({ ...character, zenit: Math.max(0, character.zenit + delta), updatedAt: new Date().toISOString() });
  }

  function moveToBackpack(kind: "weapon" | "shield" | "armor", id: string) {
    const equipment = { ...character.equipment };
    if (kind === "weapon") equipment.weapons = equipment.weapons.filter((w) => w !== id);
    if (kind === "shield") equipment.shield = undefined;
    if (kind === "armor") equipment.armor = undefined;
    onUpdate({ ...character, equipment, backpack: [...character.backpack, id], updatedAt: new Date().toISOString() });
  }

  function equipFromBackpack(id: string) {
    const equipment = { ...character.equipment };
    const backpack = character.backpack.filter((i) => i !== id);
    const weapon = ref.weapons.find((w) => w.id === id);
    const shield = ref.shields.find((s) => s.id === id);
    const armor = ref.armors.find((a) => a.id === id);

    const equippedTwoHanded = ref.weapons.find((w) => w.id === equipment.weapons[0])?.handedness === "two-handed";

    if (weapon) {
      if (!canEquipMartialWeapon(character, weapon)) {
        toast.error(`Necesitás una clase con entrenamiento marcial para equipar ${weapon.name}.`);
        return;
      }
      if (weapon.handedness === "two-handed") {
        // Takes both hand slots — bumps any currently-equipped weapon(s) and shield back to the backpack.
        backpack.push(...equipment.weapons.filter((wid) => wid !== id), ...(equipment.shield ? [equipment.shield] : []));
        equipment.weapons = [id];
        equipment.shield = undefined;
      } else if (equippedTwoHanded) {
        // Main hand only — the two-hander already had no shield equipped alongside it.
        backpack.push(...equipment.weapons);
        equipment.weapons = [id];
      } else if (equipment.weapons.length >= 2) {
        return;
      } else if (equipment.weapons.length === 1) {
        // Takes the off hand — a shield can't share it with a second weapon.
        if (equipment.shield) backpack.push(equipment.shield);
        equipment.shield = undefined;
        equipment.weapons = [...equipment.weapons, id];
      } else {
        equipment.weapons = [id];
      }
    } else if (shield) {
      if (!canEquipMartialShield(character, shield)) {
        toast.error(`Necesitás una clase con entrenamiento marcial para equipar ${shield.name}.`);
        return;
      }
      if (equippedTwoHanded) {
        toast.error("No podés equipar un escudo junto a un arma a dos manos.");
        return;
      }
      if (equipment.weapons.length >= 2) {
        // Takes the off hand — bumps the second (off-hand) weapon back to the backpack.
        backpack.push(equipment.weapons[1]);
        equipment.weapons = [equipment.weapons[0]];
      }
      if (equipment.shield) backpack.push(equipment.shield);
      equipment.shield = id;
    } else if (armor) {
      if (!canEquipMartialArmor(character, armor)) {
        toast.error(`Necesitás una clase con entrenamiento marcial para equipar ${armor.name}.`);
        return;
      }
      if (equipment.armor) backpack.push(equipment.armor);
      equipment.armor = id;
    } else {
      return;
    }
    onUpdate({ ...character, equipment, backpack, updatedAt: new Date().toISOString() });
  }

  function buy() {
    if (!shopId) return;
    const item = findEquipmentItem(shopId, ref);
    if (!item || item.cost == null || item.cost > character.zenit) return;
    onUpdate({ ...character, backpack: [...character.backpack, shopId], zenit: character.zenit - item.cost, updatedAt: new Date().toISOString() });
    setShopId("");
  }

  const shopOptions = [...ref.weapons, ...ref.armors, ...ref.shields].filter((i) => i.cost != null);

  return (
    <Panel title="Inventario">
      <div className="grid grid-cols-2 gap-2">
        <SlotDisplay
          label="Mano derecha"
          itemName={mainHand?.name}
          onUnequip={mainHand ? () => moveToBackpack("weapon", mainHand.id) : undefined}
        />
        <SlotDisplay
          label="Mano izquierda"
          itemName={offHandItem?.name}
          note={isTwoHanded ? "Ocupada por arma a dos manos" : undefined}
          onUnequip={offHandItem ? () => moveToBackpack(offHandWeapon ? "weapon" : "shield", offHandItem.id) : undefined}
        />
        <SlotDisplay
          label="Armadura"
          itemName={equippedArmor?.name}
          onUnequip={equippedArmor ? () => moveToBackpack("armor", equippedArmor.id) : undefined}
        />
        <div className="rounded-sm border border-border px-2 py-1.5">
          <label className="font-label text-2xs uppercase tracking-wide text-ink-light">Accesorio</label>
          <input
            value={character.equipment.accessory}
            onChange={(e) => onUpdate({ ...character, equipment: { ...character.equipment, accessory: e.target.value }, updatedAt: new Date().toISOString() })}
            placeholder="Objeto raro — libre"
            className="mt-0.5 w-full bg-transparent text-xs text-ink placeholder:text-leather-light/70 focus:outline-none font-body"
          />
        </div>
      </div>

      {backpackItems.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/60">
          <p className="font-label text-2xs uppercase tracking-wide text-ink-light mb-1">Mochila</p>
          {backpackItems.map(({ id, item }) => item && (
            <div key={id} className="flex items-center justify-between gap-2 py-0.5">
              <span className="font-body text-xs text-ink">{item.name}</span>
              <button type="button" onClick={() => equipFromBackpack(id)} className="font-label text-2xs uppercase text-brass hover:text-brass-bright shrink-0">Equipar</button>
            </div>
          ))}
        </div>
      )}

      <OtherItemsNote character={character} onUpdate={onUpdate} />

      <div className="mt-2 pt-2 border-t border-border/60 flex items-center gap-1.5 flex-wrap">
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="border border-border bg-parchment/60 px-2 py-1 text-xs text-ink font-body flex-1 min-w-[8rem]">
          <option value="">Comprar…</option>
          {shopOptions.map((i) => <option key={i.id} value={i.id}>{i.name} — {i.cost}z</option>)}
        </select>
        <button type="button" onClick={buy} disabled={!shopId} className="font-label text-2xs uppercase tracking-wide border border-brass/50 px-2 py-1 text-brass hover:bg-brass/10 transition-colors disabled:opacity-30">
          Comprar
        </button>
      </div>

      <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
        <span className="font-label text-xs text-ink font-semibold">{character.zenit}z <span className="text-ink-light font-body text-2xs">({spent}z eq.)</span></span>
        <AmountAdjuster onApply={adjustZenit} />
      </div>
    </Panel>
  );
}

function TraitsGuildAccordion({ character, onUpdate, guildStanding }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void; guildStanding?: React.ReactNode }) {
  return (
    <Accordion title="Rasgos, peculiaridades y gremio" summary={character.trait || "Sin rasgo definido"}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Rasgo (Trait)</label>
          <textarea
            value={character.trait}
            onChange={(e) => onUpdate({ ...character, trait: e.target.value, updatedAt: new Date().toISOString() })}
            rows={2}
            className="mt-1 w-full border border-border bg-parchment/60 px-2 py-1.5 text-xs text-ink focus:border-brass focus:outline-none font-body resize-none"
          />
        </div>
        <div>
          <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Peculiaridades (Quirks)</label>
          <textarea
            value={character.quirks}
            onChange={(e) => onUpdate({ ...character, quirks: e.target.value, updatedAt: new Date().toISOString() })}
            rows={2}
            className="mt-1 w-full border border-border bg-parchment/60 px-2 py-1.5 text-xs text-ink focus:border-brass focus:outline-none font-body resize-none"
          />
        </div>
        {guildStanding && <div className="pt-1 border-t border-border/60">{guildStanding}</div>}
      </div>
    </Accordion>
  );
}

// ─── sheet ────────────────────────────────────────────────────────────────

interface CharacterSheetProps {
  character: FUCharacter;
  portraitUrl: string | null;
  fullBodyUrl: string | null;
  backHref: string;
  onUpdate: (updated: FUCharacter) => void;
  onImagesChange: (portraitUrl: string | null, fullBodyUrl: string | null) => void;
  guildStanding?: React.ReactNode;
  /** Set when embedding the sheet somewhere other than its own dedicated page (e.g. the active mission page). */
  hideBackLink?: boolean;
}

export function CharacterSheet(props: CharacterSheetProps) {
  return (
    <ReferenceDataProvider>
      <CharacterSheetInner {...props} />
    </ReferenceDataProvider>
  );
}

function CharacterSheetInner({
  character,
  portraitUrl,
  fullBodyUrl,
  backHref,
  onUpdate,
  onImagesChange,
  guildStanding,
  hideBackLink,
}: CharacterSheetProps) {
  const ref = useReferenceDataContext();
  const classes = character.classLevels.map((cl) => ref.classesById[cl.classId]).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const current = currentAttributes(character.attributes, character.statusEffects, ref.statusEffects);
  const stats = calcDerivedStats(character.level, character.attributes, character.equipment, classes, character.statusEffects, ref);
  const inCrisis = character.currentHp <= stats.crisis.value;
  const canLevelUp = character.xp >= XP_PER_LEVEL && character.classLevels.length > 0 && character.classLevels.some((cl) => cl.levels < MAX_CLASS_LEVEL);
  const [uploadingPortrait, setUploadingPortrait] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  async function uploadImage(file: File, kind: "portrait" | "full_body") {
    setUploadingPortrait(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/rol/media", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) return;
      if (kind === "portrait") onImagesChange(json.data.url, fullBodyUrl);
      else onImagesChange(portraitUrl, json.data.url);
    } finally {
      setUploadingPortrait(false);
    }
  }

  function levelUp(classId: string, skillName: string) {
    const classLevels = character.classLevels.map((cl) =>
      cl.classId === classId ? { ...cl, levels: cl.levels + 1, skillsTaken: [...cl.skillsTaken, skillName] } : cl
    );
    onUpdate({ ...character, level: character.level + 1, xp: character.xp - XP_PER_LEVEL, classLevels, updatedAt: new Date().toISOString() });
  }

  function adjustHp(delta: number) {
    onUpdate({ ...character, currentHp: Math.max(0, Math.min(stats.hp.value, character.currentHp + delta)), updatedAt: new Date().toISOString() });
  }
  function adjustMp(delta: number) {
    onUpdate({ ...character, currentMp: Math.max(0, Math.min(stats.mp.value, character.currentMp + delta)), updatedAt: new Date().toISOString() });
  }
  function adjustXp(delta: number) {
    onUpdate({ ...character, xp: Math.max(0, character.xp + delta), updatedAt: new Date().toISOString() });
  }

  return (
    <div className="w-full px-3 py-5 md:px-6">
      {!hideBackLink && (
        <Link href={backHref} className="font-label text-2xs uppercase tracking-widest text-parchment-dark hover:text-parchment">
          ← Mis personajes
        </Link>
      )}

      <div className="relative flex surface-parchment overflow-hidden mt-2">
        <CharacterFullBodyDrawer imageUrl={fullBodyUrl} open={drawerOpen} onToggle={() => setDrawerOpen((o) => !o)} />

        <div className="min-w-0 flex-1 p-3.5 md:p-5 lg:p-7 space-y-3.5">
          {/* Header */}
          <div className="flex flex-wrap items-start gap-4 pl-6">
            <div className="relative size-20 shrink-0 rounded-full border-2 border-brass/40 overflow-hidden bg-parchment-dark/30 flex items-center justify-center">
              {portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
                <img src={portraitUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-leather-light" />
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-ink/0 hover:bg-ink/50 text-transparent hover:text-parchment transition-colors cursor-pointer text-2xs font-label uppercase text-center">
                {uploadingPortrait ? "…" : "Cambiar"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "portrait")} />
              </label>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-bold text-ink truncate">{character.name || "Héroe sin nombre"}</h1>
                <span className="font-label text-sm uppercase tracking-wide text-ink-light shrink-0">Nv {character.level}</span>
              </div>
              <p className="font-label text-xs uppercase tracking-wide text-brass mt-0.5">{classes.map((c) => c.name).join(" / ") || "Sin clase"}</p>
              <p className="font-body text-2xs text-ink-light mt-1">
                <span className="text-moss">Identidad</span> {character.identity} · <span className="text-moss">Tema</span> {character.theme} · <span className="text-moss">Origen</span> {character.origin}
              </p>
            </div>
          </div>

          {/* XP */}
          <div className="pl-6">
            <div className="flex items-center gap-2">
              <StatBar label="XP" value={character.xp} max={XP_PER_LEVEL} color="brass" />
              <StepAdjuster onChange={adjustXp} />
            </div>
            {canLevelUp && <p className="mt-1 font-label text-2xs uppercase tracking-wide text-brass-bright">¡Podés subir de nivel!</p>}
            {canLevelUp && <LevelUpControl character={character} onLevelUp={levelUp} />}
          </div>

          {/* Vista General / Acciones de Inventario / Estados — Vista General
              takes half the row, the other two split the remaining half. */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-start">
            <Panel title="Vista General" className="lg:col-span-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StatBar label="PV" value={character.currentHp} max={stats.hp.value} color="moss" markerAt={stats.crisis.value} />
                  <AmountAdjuster onApply={adjustHp} />
                </div>
                {inCrisis && <p className="font-label text-2xs uppercase tracking-wide text-crimson font-bold">● Crisis</p>}
                <div className="flex items-center gap-2">
                  <StatBar label="PM" value={character.currentMp} max={stats.mp.value} color="blue" />
                  <AmountAdjuster onApply={adjustMp} />
                </div>
              </div>

              <div className="mt-3">
                <AttributeGrid character={character} current={current} />
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                <StatTile label="DEF" value={stats.defense.value} />
                <StatTile label="DEF.M" value={stats.magicDefense.value} />
                <StatTile label="Iniciativa" value={stats.initiative.value} />
              </div>
            </Panel>

            <Panel title="Acciones de Inventario">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-label text-xs uppercase tracking-wide text-ink-light">PI</span>
                <span className="font-label text-sm font-bold text-ink">{character.currentIp} / {stats.ip.value}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {ref.ipItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.effect}
                    disabled={character.currentIp < item.ipCost}
                    onClick={() => {
                      let updated = { ...character, currentIp: character.currentIp - item.ipCost };
                      if (item.id === "remedy") updated = { ...updated, currentHp: Math.min(stats.hp.value, updated.currentHp + 50) };
                      if (item.id === "elixir") updated = { ...updated, currentMp: Math.min(stats.mp.value, updated.currentMp + 50) };
                      onUpdate({ ...updated, updatedAt: new Date().toISOString() });
                    }}
                    className="font-label text-2xs px-2 py-1.5 border border-border rounded-sm hover:border-brass disabled:opacity-30 transition-colors text-left"
                  >
                    {IP_ITEM_LABELS[item.id] ?? item.name} ({item.ipCost})
                  </button>
                ))}
              </div>
            </Panel>

            <EstadosPanel character={character} onUpdate={onUpdate} />
          </div>

          {/* Puntos de Fábula — wide, side to side */}
          <FabulaPointsPanel character={character} onUpdate={onUpdate} />

          {/* Acciones / Hechizos / Inventario, each column stacked with the
              accordions that don't need their own row — Acciones (the static
              8-item list) runs longest, so the other two columns absorb the
              rest instead of leaving a separate section below. */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
            <div className="flex flex-col gap-3">
              <ActionsReferencePanel />
            </div>
            <div className="flex flex-col gap-3">
              <SpellsPanel character={character} onUpdate={onUpdate} />
              <BondsAccordion character={character} onUpdate={onUpdate} />
              <AffinitiesAccordion character={character} onUpdate={onUpdate} />
              <ClassesAccordion character={character} onUpdate={onUpdate} />
            </div>
            <div className="flex flex-col gap-3">
              <InventarioPanel character={character} onUpdate={onUpdate} />
              <PassivesPanel character={character} />
              <HeroicSkillsAccordion character={character} onUpdate={onUpdate} />
              <TraitsGuildAccordion character={character} onUpdate={onUpdate} guildStanding={guildStanding} />
            </div>
          </div>

          {/* Glossary */}
          <p className="text-2xs text-ink-light font-body border-t border-border/60 pt-2 flex items-start gap-1">
            <Info size={12} className="shrink-0 mt-px" />
            {glossary.map((g, i) => (
              <React.Fragment key={g.term}>
                {i > 0 && " · "}
                <strong className="text-ink">{g.term}:</strong> {g.definition}
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}

function LevelUpControl({ character, onLevelUp }: { character: FUCharacter; onLevelUp: (classId: string, skillName: string) => void }) {
  const ref = useReferenceDataContext();
  const eligibleClasses = character.classLevels.filter((cl) => cl.levels < MAX_CLASS_LEVEL);
  const [classId, setClassId] = React.useState(eligibleClasses[0]?.classId ?? "");
  const cls = classId ? ref.classesById[classId] : undefined;
  const [skillName, setSkillName] = React.useState("");

  const skillOptions = cls?.skills.filter((s) => {
    const cl = character.classLevels.find((c) => c.classId === classId);
    const taken = (cl?.skillsTaken ?? []).filter((n) => n === s.name).length;
    return taken < s.maxLevel;
  }) ?? [];

  return (
    <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-end">
      <select value={classId} onChange={(e) => { setClassId(e.target.value); setSkillName(""); }} className="flex-1 border border-border bg-parchment/60 px-2 py-1 text-xs text-ink font-body">
        {eligibleClasses.map((cl) => <option key={cl.classId} value={cl.classId}>{ref.classesById[cl.classId]?.name}</option>)}
      </select>
      <select value={skillName} onChange={(e) => setSkillName(e.target.value)} className="flex-1 border border-border bg-parchment/60 px-2 py-1 text-xs text-ink font-body">
        <option value="">Nueva habilidad…</option>
        {skillOptions.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
      </select>
      <button
        type="button"
        disabled={!classId || !skillName}
        onClick={() => classId && skillName && onLevelUp(classId, skillName)}
        className="font-label text-2xs uppercase tracking-wide border border-brass bg-brass/10 px-3 py-1 text-brass-bright hover:bg-brass/20 transition-colors disabled:opacity-30"
      >
        Subir de nivel
      </button>
    </div>
  );
}
