"use client";

import * as React from "react";
import Link from "next/link";
import { User, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion } from "@/components/ui/Accordion";
import { bondEmotionsById, bondPairings, bondsRulesNote, MAX_BONDS, type BondEmotionId } from "@/app/FU/data/bonds";
import { fabulaPointGains, fabulaPointUses, glossary } from "@/app/FU/data/reference";
import type { AttributeKey } from "@/app/FU/data/statusEffects";
import { elements, affinityStatusOrder, affinityStatusLabels, type AffinityStatus } from "@/app/FU/data/affinities";
import type { FUArmor, FUShield, FUWeapon } from "@/app/FU/data/types";
import {
  calcDerivedStats, currentAttributes, findEquipmentItem, calcSpent,
  XP_PER_LEVEL, MAX_CLASS_LEVEL, MAX_CLASSES,
} from "@/app/FU/lib/derivedStats";
import type { FUBond, FUCharacter, FUCharacterAttributes } from "@/app/FU/lib/types";
import { ReferenceDataProvider, useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import type { FUReferenceData } from "@/app/FU/data/referenceDataType";
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

function StatPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="font-display text-base font-bold text-brass-bright leading-none">{value}</div>
      <div className="font-label text-2xs uppercase tracking-wide text-ink-light">{label}</div>
    </div>
  );
}

/** Compact +/- pair — the "functional, not just a label" interaction the spec asks for, sized for inline use. */
function Adjuster({ value, onChange, min = 0, max }: { value: number; onChange: (next: number) => void; min?: number; max?: number }) {
  function clamp(n: number) {
    let v = n;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  }
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button type="button" onClick={() => onChange(clamp(value - 1))} aria-label="Restar" className="flex size-5 items-center justify-center rounded-full border border-border text-xs leading-none text-ink hover:border-brass">−</button>
      <button type="button" onClick={() => onChange(clamp(value + 1))} aria-label="Sumar" className="flex size-5 items-center justify-center rounded-full border border-border text-xs leading-none text-ink hover:border-brass">+</button>
    </div>
  );
}

function FabulaBadge({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label="Gastar Punto de Fábula" className="text-ink-light hover:text-crimson text-sm leading-none">−</button>
        <span className="flex size-7 items-center justify-center rounded-full border-2 border-brass-light bg-crimson font-display text-sm font-bold text-crimson-foreground">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} aria-label="Ganar Punto de Fábula" className="text-ink-light hover:text-moss text-sm leading-none">+</button>
      </div>
      <div className="flex items-center gap-0.5">
        <span className="font-label text-2xs uppercase tracking-wide text-ink-light">Fábula</span>
        <InfoDisclosure label="Puntos de Fábula">
          <p className="font-semibold text-ink mb-1">Ganás un punto cuando…</p>
          <ul className="space-y-1 mb-2">{fabulaPointGains.map((g, i) => <li key={i}>· {g}</li>)}</ul>
          <p className="font-semibold text-ink mb-1">Gastás un punto para…</p>
          <ul className="space-y-1">{fabulaPointUses.map((u, i) => <li key={i}>· {u}</li>)}</ul>
        </InfoDisclosure>
      </div>
    </div>
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
    <div className="grid grid-cols-2 gap-2">
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

function StatusEffectToggles({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const ref = useReferenceDataContext();

  function toggleEffect(id: string) {
    const active = character.statusEffects.includes(id);
    const next = active ? character.statusEffects.filter((e) => e !== id) : [...character.statusEffects, id];
    onUpdate({ ...character, statusEffects: next, updatedAt: new Date().toISOString() });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-label text-2xs uppercase tracking-wide text-ink-light shrink-0">Estados</span>
      {ref.statusEffects.map((effect) => {
        const active = character.statusEffects.includes(effect.id);
        return (
          <button
            key={effect.id}
            type="button"
            onClick={() => toggleEffect(effect.id)}
            className={cn(
              "font-label text-2xs px-2 py-0.5 rounded-full border transition-colors",
              active ? "border-crimson bg-crimson/10 text-crimson font-semibold" : "border-border text-ink-light hover:border-crimson/50"
            )}
          >
            {effect.name}
          </button>
        );
      })}
      <InfoDisclosure label="Qué hace cada estado">
        {ref.statusEffects.map((e) => <p key={e.id} className="mb-1.5 last:mb-0"><strong className="text-ink">{e.name}:</strong> {e.description}</p>)}
      </InfoDisclosure>
    </div>
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

function ActionsAccordion({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const ref = useReferenceDataContext();

  function spendMp(amount: number) {
    onUpdate({ ...character, currentMp: Math.max(0, character.currentMp - amount), updatedAt: new Date().toISOString() });
  }

  let activeCount = 0;
  const rows: React.ReactNode[] = [];

  for (const cl of character.classLevels) {
    const cls = ref.classesById[cl.classId];
    if (!cls) continue;
    const counts = new Map<string, number>();
    for (const name of cl.skillsTaken) counts.set(name, (counts.get(name) ?? 0) + 1);
    for (const [name, count] of Array.from(counts.entries())) {
      const skill = cls.skills.find((s) => s.name === name);
      if (!skill) continue;
      const maxed = count >= skill.maxLevel;
      activeCount++;
      rows.push(
        <ActiveSkillRow key={`${cl.classId}-${name}`} name={name} maxed={maxed} text={skill.text} skillLevel={count} currentMp={character.currentMp} onCast={spendMp} />
      );
    }

    if (cls.subsystem?.type === "spells") {
      for (const spell of cls.subsystem.entries) {
        const numericCost = Number(spell.mpCost);
        activeCount++;
        rows.push(
          <div key={`${cl.classId}-spell-${spell.name}`} className="rounded-sm border border-border px-2.5 py-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-body text-sm font-semibold text-ink">{spell.name} <span className="font-label text-2xs text-moss">{spell.mpCost} PM · {spell.target}</span></span>
              {Number.isFinite(numericCost) && numericCost > 0 ? (
                <button type="button" onClick={() => spendMp(numericCost)} className="font-label text-2xs uppercase tracking-wide border border-brass/50 px-2 py-0.5 text-brass hover:bg-brass/10 transition-colors shrink-0">
                  Lanzar −{numericCost}
                </button>
              ) : (
                <span className="font-body text-2xs italic text-ink-light">Costo variable</span>
              )}
            </div>
            <p className="mt-0.5 text-xs leading-snug text-ink-light font-body">{spell.text}</p>
          </div>
        );
      }
    }
  }

  return (
    <Accordion title="Acciones" summary={`${activeCount} activa(s)`} defaultOpen>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-light font-body">Todavía no elegiste habilidades.</p>
      ) : (
        <div className="space-y-1.5">{rows}</div>
      )}
    </Accordion>
  );
}

function ActiveSkillRow({ name, maxed, text, skillLevel, currentMp, onCast }: {
  name: string; maxed: boolean; text: string; skillLevel: number; currentMp: number; onCast: (mpCost: number) => void;
}) {
  const [cost, setCost] = React.useState("");

  return (
    <div className="rounded-sm border border-border px-2.5 py-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-body text-sm font-semibold text-ink">{name}{maxed && <span className="text-brass ml-1">(máx)</span>}</span>
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
            onClick={() => { const n = Number(cost) || 0; if (n > 0) { onCast(n); setCost(""); } }}
            className="font-label text-2xs uppercase tracking-wide border border-brass/50 px-2 py-0.5 text-brass hover:bg-brass/10 transition-colors"
          >
            Lanzar
          </button>
        </div>
      </div>
      <SkillText text={text} skillLevel={skillLevel} className="mt-0.5 text-xs leading-snug text-ink-light font-body" />
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

function EquipmentAccordion({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const ref = useReferenceDataContext();
  const equippedWeapons = character.equipment.weapons.map((id) => findEquipmentItem(id, ref)).filter(Boolean);
  const equippedShield = character.equipment.shield ? findEquipmentItem(character.equipment.shield, ref) : undefined;
  const equippedArmor = character.equipment.armor ? findEquipmentItem(character.equipment.armor, ref) : undefined;
  const backpackItems = character.backpack.map((id) => ({ id, item: findEquipmentItem(id, ref) }));
  const spent = calcSpent(character.equipment, ref);

  const [shopId, setShopId] = React.useState("");

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
  const equippedCount = equippedWeapons.length + (equippedShield ? 1 : 0) + (equippedArmor ? 1 : 0) + (character.equipment.accessory ? 1 : 0);

  return (
    <Accordion title="Equipo" summary={`${equippedCount} equipado(s) · ${character.backpack.length} mochila`} defaultOpen>
      <div>
        {equippedWeapons.map((w) => w && (
          <div key={w.id} className="flex items-center justify-between gap-2 py-1 border-t border-border/60 first:border-t-0">
            <span className="font-body text-xs text-ink">{w.name} {"accuracy" in w && <span className="text-moss">· {w.accuracy}→{w.damage}</span>}</span>
            <button type="button" onClick={() => moveToBackpack("weapon", w.id)} className="font-label text-2xs uppercase text-leather-light hover:text-crimson shrink-0">Guardar</button>
          </div>
        ))}
        {equippedShield && (
          <div className="flex items-center justify-between gap-2 py-1 border-t border-border/60 first:border-t-0">
            <span className="font-body text-xs text-ink">{equippedShield.name}</span>
            <button type="button" onClick={() => moveToBackpack("shield", equippedShield.id)} className="font-label text-2xs uppercase text-leather-light hover:text-crimson shrink-0">Guardar</button>
          </div>
        )}
        {equippedArmor && (
          <div className="flex items-center justify-between gap-2 py-1 border-t border-border/60 first:border-t-0">
            <span className="font-body text-xs text-ink">{equippedArmor.name}</span>
            <button type="button" onClick={() => moveToBackpack("armor", equippedArmor.id)} className="font-label text-2xs uppercase text-leather-light hover:text-crimson shrink-0">Guardar</button>
          </div>
        )}
        {equippedCount === 0 && <p className="text-xs text-ink-light font-body py-1">Sin equipo.</p>}
      </div>

      <div className="mt-2 pt-2 border-t border-border/60">
        <label className="font-label text-2xs uppercase tracking-wide text-ink-light">Accesorio</label>
        <input
          value={character.equipment.accessory}
          onChange={(e) => onUpdate({ ...character, equipment: { ...character.equipment, accessory: e.target.value }, updatedAt: new Date().toISOString() })}
          placeholder="Objeto raro sin catálogo fijo — descripción libre"
          className="mt-1 w-full border border-border bg-parchment/60 px-2 py-1 text-xs text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body"
        />
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

      <div className="mt-2 pt-2 border-t border-border/60 flex items-center gap-1.5 flex-wrap">
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="border border-border bg-parchment/60 px-2 py-1 text-xs text-ink font-body flex-1 min-w-[8rem]">
          <option value="">Comprar…</option>
          {shopOptions.map((i) => <option key={i.id} value={i.id}>{i.name} — {i.cost}z</option>)}
        </select>
        <button type="button" onClick={buy} disabled={!shopId} className="font-label text-2xs uppercase tracking-wide border border-brass/50 px-2 py-1 text-brass hover:bg-brass/10 transition-colors disabled:opacity-30">
          Comprar
        </button>
        <span className="font-label text-xs text-brass-bright ml-auto">{character.zenit}z <span className="text-ink-light font-body text-2xs">({spent}z eq.)</span></span>
      </div>
    </Accordion>
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

  const weapon = character.equipment.weapons[0] ? findEquipmentItem(character.equipment.weapons[0], ref) : null;

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 md:px-6">
      {!hideBackLink && (
        <Link href={backHref} className="font-label text-2xs uppercase tracking-widest text-parchment-dark hover:text-parchment">
          ← Mis personajes
        </Link>
      )}

      <div className="relative flex surface-parchment overflow-hidden mt-2">
        <CharacterFullBodyDrawer imageUrl={fullBodyUrl} open={drawerOpen} onToggle={() => setDrawerOpen((o) => !o)} />

        <div className="min-w-0 flex-1 p-3.5 md:p-5 lg:p-7 space-y-3.5">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 pl-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative size-11 shrink-0 rounded-full border border-brass/40 overflow-hidden bg-parchment-dark/30 flex items-center justify-center">
                {portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
                  <img src={portraitUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-leather-light" />
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-ink/0 hover:bg-ink/50 text-transparent hover:text-parchment transition-colors cursor-pointer text-2xs font-label uppercase text-center">
                  {uploadingPortrait ? "…" : "Cambiar"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "portrait")} />
                </label>
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h1 className="font-display text-lg font-bold text-ink truncate">{character.name || "Héroe sin nombre"}</h1>
                  <span className="font-label text-2xs uppercase tracking-wide text-ink-light shrink-0">
                    Nv {character.level} · {classes.map((c) => c.name).join(" / ") || "Sin clase"}
                  </span>
                </div>
                <p className="font-body text-2xs text-ink-light truncate">
                  <span className="text-moss">Identidad</span> {character.identity} · <span className="text-moss">Tema</span> {character.theme} · <span className="text-moss">Origen</span> {character.origin}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <StatPill label="Zenit" value={`${character.zenit}z`} />
              <FabulaBadge value={character.fabulaPoints} onChange={(v) => onUpdate({ ...character, fabulaPoints: v, updatedAt: new Date().toISOString() })} />
            </div>
          </div>

          {/* XP */}
          <div className="pl-6">
            <div className="flex items-center justify-between font-label text-2xs uppercase tracking-wide text-ink-light">
              <span>XP {character.xp}/{XP_PER_LEVEL}</span>
              {canLevelUp && <span className="text-brass-bright">¡Podés subir de nivel!</span>}
            </div>
            <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-parchment-dark/40">
              <div className="h-full rounded-full bg-brass transition-all duration-500" style={{ width: `${Math.min(100, (character.xp / XP_PER_LEVEL) * 100)}%` }} />
            </div>
            {canLevelUp && <LevelUpControl character={character} onLevelUp={levelUp} />}
          </div>

          {/* Cockpit */}
          <div className="bg-parchment-dark/25 border border-brass/30 rounded-sm p-3 space-y-2.5">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <StatBar label="PV" value={character.currentHp} max={stats.hp.value} color="moss" markerAt={stats.crisis.value} />
                <div className="mt-1 flex items-center justify-between">
                  {inCrisis ? <span className="font-label text-2xs uppercase tracking-wide text-crimson font-bold">● Crisis</span> : <span />}
                  <Adjuster value={character.currentHp} max={stats.hp.value} onChange={(v) => onUpdate({ ...character, currentHp: v, updatedAt: new Date().toISOString() })} />
                </div>
              </div>
              <div>
                <StatBar label="PM" value={character.currentMp} max={stats.mp.value} color="blue" />
                <div className="mt-1 flex justify-end">
                  <Adjuster value={character.currentMp} max={stats.mp.value} onChange={(v) => onUpdate({ ...character, currentMp: v, updatedAt: new Date().toISOString() })} />
                </div>
              </div>
              <div>
                <div className="font-label flex justify-between text-xs uppercase tracking-wide text-ink-light">
                  <span>PI</span>
                  <span>{character.currentIp} / {stats.ip.value}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-body text-2xs text-ink-light">Objetos de inventario</span>
                  <Adjuster value={character.currentIp} max={stats.ip.value} onChange={(v) => onUpdate({ ...character, currentIp: v, updatedAt: new Date().toISOString() })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <AttributeGrid character={character} current={current} />
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
                    className="font-label text-2xs px-2 py-1.5 border border-border rounded-sm hover:border-brass disabled:opacity-30 transition-colors"
                  >
                    {IP_ITEM_LABELS[item.id] ?? item.name} ({item.ipCost})
                  </button>
                ))}
              </div>
            </div>

            <StatusEffectToggles character={character} onUpdate={onUpdate} />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-2xs text-ink-light border-t border-border/60 pt-2">
              <span>DEF <strong className="text-ink">{stats.defense.value}</strong></span>
              <span>Def.M <strong className="text-ink">{stats.magicDefense.value}</strong></span>
              <span>Iniciativa <strong className="text-ink">{stats.initiative.value}</strong></span>
              <span className="flex-1 min-w-[10rem]">
                {weapon && "accuracy" in weapon ? (
                  <>Ataque: <strong className="text-ink">{weapon.name}: {weapon.accuracy} → {weapon.damage}</strong></>
                ) : (
                  <>Ataque: <strong className="text-ink">Desarmado 【DEX+VIG】→【HR】físico</strong></>
                )}
              </span>
            </div>
          </div>

          {/* Accordion cards */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <ActionsAccordion character={character} onUpdate={onUpdate} />
            <EquipmentAccordion character={character} onUpdate={onUpdate} />
            <AffinitiesAccordion character={character} onUpdate={onUpdate} />
            <ClassesAccordion character={character} onUpdate={onUpdate} />
            <BondsAccordion character={character} onUpdate={onUpdate} />
            <TraitsGuildAccordion character={character} onUpdate={onUpdate} guildStanding={guildStanding} />
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
