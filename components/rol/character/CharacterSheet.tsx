"use client";

import * as React from "react";
import Link from "next/link";
import { User, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion } from "@/components/ui/Accordion";
import { classesById } from "@/app/FU/data/classes";
import { bondEmotionsById, bondPairings, bondsRulesNote, MAX_BONDS, type BondEmotionId } from "@/app/FU/data/bonds";
import { fabulaPointGains, fabulaPointUses, fabulaPointsNote, ipItems, glossary } from "@/app/FU/data/reference";
import { statusEffects, statusEffectRulesNote, type AttributeKey } from "@/app/FU/data/statusEffects";
import { elements, affinityStatusOrder, affinityStatusLabels, affinitiesRulesNote, type AffinityStatus } from "@/app/FU/data/affinities";
import { weapons, armors, shields } from "@/app/FU/data/equipment";
import {
  calcDerivedStats, currentAttributes, findEquipmentItem, calcSpent,
  XP_PER_LEVEL, MAX_CLASS_LEVEL,
} from "@/app/FU/lib/derivedStats";
import type { FUBond, FUCharacter, FUCharacterAttributes } from "@/app/FU/lib/types";
import { InfoDisclosure } from "./InfoDisclosure";
import { SkillText } from "./SkillText";
import { StatBar } from "./StatBar";
import { CharacterFullBodyDrawer } from "./CharacterFullBodyDrawer";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-parchment p-4 text-center">
      <div className="font-label text-xs uppercase tracking-wide text-ink-light">{label}</div>
      <div className="font-display text-2xl font-bold text-brass-bright">{value}</div>
    </div>
  );
}

function CockpitCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold text-parchment mb-3">{title}</h2>
      <div className="surface-parchment p-6">{children}</div>
    </section>
  );
}

/** +/- adjuster shared by HP/MP/IP/Fabula — the "functional, not just a label" interaction the spec asks for. */
function Adjuster({ value, onChange, min = 0, max }: { value: number; onChange: (next: number) => void; min?: number; max?: number }) {
  function clamp(n: number) {
    let v = n;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  }
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(clamp(value - 1))} aria-label="Restar" className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-lg leading-none text-ink hover:border-brass">−</button>
      <button type="button" onClick={() => onChange(clamp(value + 1))} aria-label="Sumar" className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-lg leading-none text-ink hover:border-brass">+</button>
    </div>
  );
}

const ATTRIBUTE_ROWS: { key: AttributeKey; label: string }[] = [
  { key: "dexterity", label: "Destreza" },
  { key: "insight", label: "Perspicacia" },
  { key: "might", label: "Vigor" },
  { key: "willpower", label: "Voluntad" },
];

function AttributesAndStatusPanel({ character, current, onUpdate }: { character: FUCharacter; current: FUCharacterAttributes; onUpdate: (updated: FUCharacter) => void }) {
  function toggleEffect(id: string) {
    const active = character.statusEffects.includes(id);
    const next = active ? character.statusEffects.filter((e) => e !== id) : [...character.statusEffects, id];
    onUpdate({ ...character, statusEffects: next, updatedAt: new Date().toISOString() });
  }

  return (
    <CockpitCard title="Atributos y estados">
      <div className="grid gap-2.5">
        {ATTRIBUTE_ROWS.map(({ key, label }) => {
          const base = character.attributes[key];
          const curr = current[key];
          const reduced = curr !== base;
          return (
            <div key={key} className="border border-border px-4 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink font-body">{label}</span>
                <span className="font-label text-sm">
                  <span className={reduced ? "text-ink-light line-through" : "text-brass-bright"}>d{base}</span>
                  {reduced && <span className="ml-1.5 text-crimson">d{curr}</span>}
                </span>
              </div>
              {reduced && (
                <p className="font-body text-2xs text-crimson mt-1">
                  {statusEffects.filter((e) => character.statusEffects.includes(e.id) && e.affects.includes(key)).map((e) => e.name).join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {statusEffects.map((effect) => {
          const active = character.statusEffects.includes(effect.id);
          return (
            <div key={effect.id} className={cn("flex items-center gap-2 border px-3 py-2.5 text-sm", active ? "border-crimson bg-crimson/10" : "border-border")}>
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={active} onChange={() => toggleEffect(effect.id)} className="h-4 w-4 accent-crimson" />
                <span className={cn("font-body", active ? "font-semibold text-crimson" : "text-ink")}>{effect.name}</span>
              </label>
              <InfoDisclosure label={`Qué hace ${effect.name}`}>{effect.description}</InfoDisclosure>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-light font-body">{statusEffectRulesNote}</p>
    </CockpitCard>
  );
}

function FabulaPointsPanel({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  function adjust(delta: number) {
    onUpdate({ ...character, fabulaPoints: Math.max(0, character.fabulaPoints + delta), updatedAt: new Date().toISOString() });
  }

  return (
    <CockpitCard title="Puntos de Fábula">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => adjust(-1)} aria-label="Gastar un Punto de Fábula" className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-2xl leading-none text-ink hover:border-brass">−</button>
        <span className="font-display w-12 text-center text-3xl font-bold text-brass-bright">{character.fabulaPoints}</span>
        <button type="button" onClick={() => adjust(1)} aria-label="Ganar un Punto de Fábula" className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-2xl leading-none text-ink hover:border-brass">+</button>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink-light">Ganás un punto cuando…</p>
          <ul className="mt-1.5 space-y-1.5 text-sm leading-snug text-ink font-body">{fabulaPointGains.map((g, i) => <li key={i}>· {g}</li>)}</ul>
        </div>
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink-light">Gastás un punto para…</p>
          <ul className="mt-1.5 space-y-1.5 text-sm leading-snug text-ink font-body">{fabulaPointUses.map((u, i) => <li key={i}>· {u}</li>)}</ul>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-light font-body">{fabulaPointsNote}</p>
    </CockpitCard>
  );
}

function BondEditor({ bond, onChange, onRemove }: { bond: FUBond; onChange: (bond: FUBond) => void; onRemove: () => void }) {
  function toggle(pair: [BondEmotionId, BondEmotionId], emotionId: BondEmotionId) {
    const [a, b] = pair;
    const isActive = bond.emotions.includes(emotionId);
    const withoutPair = bond.emotions.filter((e) => e !== a && e !== b);
    onChange({ ...bond, emotions: isActive ? withoutPair : [...withoutPair, emotionId] });
  }

  return (
    <div className="border border-border p-4">
      <div className="flex items-center gap-3">
        <input
          value={bond.name}
          onChange={(e) => onChange({ ...bond, name: e.target.value })}
          placeholder="¿Con quién o qué es este Vínculo?"
          className="flex-1 border border-border bg-parchment/60 px-3 py-2 text-sm text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body"
        />
        <span className="font-label whitespace-nowrap text-xs uppercase tracking-wide text-brass-bright">
          Nivel {bond.emotions.length}{bond.emotions.length >= 3 && " (máx)"}
        </span>
        <button type="button" onClick={onRemove} aria-label="Quitar Vínculo" className="text-leather-light hover:text-crimson">
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
                    "flex-1 border px-2.5 py-1.5 text-xs font-body transition-colors",
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
        <p className="text-sm text-ink-light font-body">Todavía no hay Vínculos — suelen formarse en escenas de descanso, a medida que avanza la historia.</p>
      ) : (
        <div className="space-y-3">{character.bonds.map((bond, i) => <BondEditor key={i} bond={bond} onChange={(b) => updateBond(i, b)} onRemove={() => removeBond(i)} />)}</div>
      )}
      <button
        type="button"
        onClick={addBond}
        disabled={character.bonds.length >= MAX_BONDS}
        className="font-label mt-3 border border-brass/50 px-3 py-1.5 text-xs uppercase tracking-wide text-brass transition-colors hover:bg-brass/10 disabled:opacity-30"
      >
        + Vínculo
      </button>
      <p className="mt-4 text-xs leading-relaxed text-ink-light font-body">{bondsRulesNote}</p>
    </Accordion>
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
    <Accordion title="Afinidades elementales" summary={nonNormalCount > 0 ? `${nonNormalCount} distinta(s) de normal` : "Todas normales"}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {elements.map((el) => {
          const status: AffinityStatus = character.elementalAffinities[el.id] ?? "normal";
          return (
            <button
              key={el.id}
              type="button"
              onClick={() => cycle(el.id)}
              className={cn(
                "border px-3 py-2.5 text-left transition-colors",
                status === "normal" ? "border-border" : "border-brass bg-brass/10"
              )}
            >
              <div className="font-body text-sm font-semibold text-ink">{el.name}</div>
              <div className="font-label text-2xs uppercase tracking-wide text-brass-bright">{affinityStatusLabels[status]}</div>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-light font-body">{affinitiesRulesNote}</p>
    </Accordion>
  );
}

function ActiveSkillCard({ name, maxed, text, skillLevel, currentMp, onCast }: {
  name: string; maxed: boolean; text: string; skillLevel: number; currentMp: number; onCast: (mpCost: number) => void;
}) {
  const [cost, setCost] = React.useState("");

  return (
    <div className="border border-border p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-semibold text-ink font-body">{name}{maxed && " (máx)"}</span>
      </div>
      <SkillText text={text} skillLevel={skillLevel} className="mt-1.5 text-sm leading-snug text-ink-light font-body" />
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={currentMp}
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="Costo en PM"
          className="w-24 border border-border bg-parchment/60 px-2 py-1.5 text-xs text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body"
        />
        <button
          type="button"
          onClick={() => { const n = Number(cost) || 0; if (n > 0) { onCast(n); setCost(""); } }}
          className="font-label text-2xs uppercase tracking-wide border border-brass/50 px-2.5 py-1.5 text-brass hover:bg-brass/10 transition-colors"
        >
          Lanzar
        </button>
      </div>
    </div>
  );
}

function ActionsAccordion({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  function spendMp(amount: number) {
    onUpdate({ ...character, currentMp: Math.max(0, character.currentMp - amount), updatedAt: new Date().toISOString() });
  }

  const classes = character.classLevels.map((cl) => classesById[cl.classId]).filter((c): c is NonNullable<typeof c> => Boolean(c));
  let activeCount = 0;
  const cards: React.ReactNode[] = [];

  for (const cl of character.classLevels) {
    const cls = classesById[cl.classId];
    if (!cls) continue;
    const counts = new Map<string, number>();
    for (const name of cl.skillsTaken) counts.set(name, (counts.get(name) ?? 0) + 1);
    for (const [name, count] of Array.from(counts.entries())) {
      const skill = cls.skills.find((s) => s.name === name);
      if (!skill) continue;
      const maxed = count >= skill.maxLevel;
      // No structured MP-cost field exists on skill data (only on the
      // separate spell subsystem below) — the player reads the cost printed
      // in the skill's own text and enters it here; this still gives a real
      // deduction, not just a label.
      activeCount++;
      cards.push(
        <ActiveSkillCard key={`${cl.classId}-${name}`} name={name} maxed={maxed} text={skill.text} skillLevel={count} currentMp={character.currentMp} onCast={spendMp} />
      );
    }

    if (cls.subsystem?.type === "spells") {
      for (const spell of cls.subsystem.entries) {
        const numericCost = Number(spell.mpCost);
        activeCount++;
        cards.push(
          <div key={`${cl.classId}-spell-${spell.name}`} className="border border-border p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-semibold text-ink font-body">{spell.name}</span>
              <span className="font-label text-2xs text-moss">{spell.mpCost} PM · {spell.target}</span>
            </div>
            <p className="mt-1.5 text-sm leading-snug text-ink-light font-body">{spell.text}</p>
            {Number.isFinite(numericCost) && numericCost > 0 ? (
              <button
                type="button"
                onClick={() => spendMp(numericCost)}
                className="font-label mt-2 text-2xs uppercase tracking-wide border border-brass/50 px-2.5 py-1.5 text-brass hover:bg-brass/10 transition-colors"
              >
                Lanzar (−{numericCost} PM)
              </button>
            ) : (
              <p className="mt-2 text-2xs italic text-ink-light font-body">Costo variable — ajustá los PM en Vitalidad.</p>
            )}
          </div>
        );
      }
    }
  }

  return (
    <Accordion title="Acciones" summary={`${activeCount} habilidad(es) activa(s)`} defaultOpen>
      {cards.length === 0 ? (
        <p className="text-sm text-ink-light font-body">Todavía no elegiste habilidades.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">{cards}</div>
      )}
      {classes.length > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-ink-light font-body">
          Las habilidades pasivas se aplican siempre y no tienen costo — están listadas en la sección Clases y habilidades.
        </p>
      )}
    </Accordion>
  );
}

function ClassesAccordion({ character }: { character: FUCharacter }) {
  return (
    <Accordion title="Clases y habilidades" summary={character.classLevels.map((cl) => classesById[cl.classId]?.name).filter(Boolean).join(" · ")}>
      <div className={cn("grid gap-4", character.classLevels.length > 1 && "xl:grid-cols-2")}>
        {character.classLevels.map((cl) => {
          const cls = classesById[cl.classId];
          if (!cls) return null;
          const counts = new Map<string, number>();
          for (const name of cl.skillsTaken) counts.set(name, (counts.get(name) ?? 0) + 1);
          return (
            <div key={cl.classId}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-display text-lg font-bold text-ink">{cls.name}</span>
                <span className="font-label text-xs uppercase tracking-wide text-ink-light">Nv {cl.levels}{cl.levels >= MAX_CLASS_LEVEL && " (máx)"}</span>
              </div>
              <div className="border border-border p-4">
                <ul className="space-y-1 text-sm text-ink-light font-body">{cls.freeBenefits.map((b, i) => <li key={i}>· {b.text}</li>)}</ul>
                <div className="mt-4 space-y-3">
                  {Array.from(counts.entries()).map(([name, count]) => {
                    const skill = cls.skills.find((s) => s.name === name);
                    if (!skill) return null;
                    return (
                      <div key={name} className="border border-border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-ink font-body">{skill.name}</span>
                          {skill.maxLevel > 1 && (
                            <span className="font-label text-xs text-moss">
                              NH {count}/{skill.maxLevel}{count >= skill.maxLevel && " (máx)"}
                            </span>
                          )}
                        </div>
                        <SkillText text={skill.text} skillLevel={count} className="mt-1.5 text-sm leading-snug text-ink-light font-body" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Accordion>
  );
}

function TraitsAccordion({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  return (
    <Accordion title="Rasgos y peculiaridades" summary={character.trait || "Sin rasgo definido"}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light">Rasgo (Trait)</label>
          <textarea
            value={character.trait}
            onChange={(e) => onUpdate({ ...character, trait: e.target.value, updatedAt: new Date().toISOString() })}
            rows={2}
            className="mt-1.5 w-full border border-border bg-parchment/60 px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none font-body resize-none"
          />
        </div>
        <div>
          <label className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light">Peculiaridades (Quirks)</label>
          <textarea
            value={character.quirks}
            onChange={(e) => onUpdate({ ...character, quirks: e.target.value, updatedAt: new Date().toISOString() })}
            rows={2}
            className="mt-1.5 w-full border border-border bg-parchment/60 px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none font-body resize-none"
          />
        </div>
      </div>
    </Accordion>
  );
}

function EquipmentAccordion({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const equippedWeapons = character.equipment.weapons.map((id) => findEquipmentItem(id)).filter(Boolean);
  const equippedShield = character.equipment.shield ? findEquipmentItem(character.equipment.shield) : undefined;
  const equippedArmor = character.equipment.armor ? findEquipmentItem(character.equipment.armor) : undefined;
  const backpackItems = character.backpack.map((id) => ({ id, item: findEquipmentItem(id) }));
  const spent = calcSpent(character.equipment);

  const [shopId, setShopId] = React.useState("");

  function moveToBackpack(kind: "weapon" | "shield" | "armor", id: string) {
    const equipment = { ...character.equipment };
    if (kind === "weapon") equipment.weapons = equipment.weapons.filter((w) => w !== id);
    if (kind === "shield") equipment.shield = undefined;
    if (kind === "armor") equipment.armor = undefined;
    onUpdate({ ...character, equipment, backpack: [...character.backpack, id], updatedAt: new Date().toISOString() });
  }

  function equipFromBackpack(id: string) {
    const item = findEquipmentItem(id);
    if (!item) return;
    const equipment = { ...character.equipment };
    const backpack = character.backpack.filter((i) => i !== id);
    if (weapons.some((w) => w.id === id)) {
      if (equipment.weapons.length >= 2) { backpack.push(id); return; }
      equipment.weapons = [...equipment.weapons, id];
    } else if (shields.some((s) => s.id === id)) {
      if (equipment.shield) backpack.push(equipment.shield);
      equipment.shield = id;
    } else if (armors.some((a) => a.id === id)) {
      if (equipment.armor) backpack.push(equipment.armor);
      equipment.armor = id;
    }
    onUpdate({ ...character, equipment, backpack, updatedAt: new Date().toISOString() });
  }

  function buy() {
    if (!shopId) return;
    const item = findEquipmentItem(shopId);
    if (!item || item.cost == null || item.cost > character.zenit) return;
    onUpdate({ ...character, backpack: [...character.backpack, shopId], zenit: character.zenit - item.cost, updatedAt: new Date().toISOString() });
    setShopId("");
  }

  const shopOptions = [...weapons, ...armors, ...shields].filter((i) => i.cost != null);

  return (
    <Accordion title="Equipo" summary={`${equippedWeapons.length + (equippedShield ? 1 : 0) + (equippedArmor ? 1 : 0)} equipado(s) · ${character.backpack.length} en mochila`} defaultOpen>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink-light mb-2">Equipado</p>
          <div className="flex flex-col gap-2">
            {equippedWeapons.map((w) => w && (
              <div key={w.id} className="border border-border p-3 text-sm font-body flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-ink">{w.name}</div>
                  {"accuracy" in w && <div className="text-xs text-moss">{w.accuracy} → {w.damage}</div>}
                </div>
                <button type="button" onClick={() => moveToBackpack("weapon", w.id)} className="font-label text-2xs uppercase text-leather-light hover:text-crimson shrink-0">Guardar</button>
              </div>
            ))}
            {equippedShield && (
              <div className="border border-border p-3 text-sm font-body flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-ink">{equippedShield.name}</div>
                  {"defenseBonus" in equippedShield && <div className="text-xs text-moss">Def +{equippedShield.defenseBonus} · Def.M +{equippedShield.magicDefenseBonus}</div>}
                </div>
                <button type="button" onClick={() => moveToBackpack("shield", equippedShield.id)} className="font-label text-2xs uppercase text-leather-light hover:text-crimson shrink-0">Guardar</button>
              </div>
            )}
            {equippedArmor && (
              <div className="border border-border p-3 text-sm font-body flex items-center justify-between gap-2">
                <div className="font-semibold text-ink">{equippedArmor.name}</div>
                <button type="button" onClick={() => moveToBackpack("armor", equippedArmor.id)} className="font-label text-2xs uppercase text-leather-light hover:text-crimson shrink-0">Guardar</button>
              </div>
            )}
            {equippedWeapons.length === 0 && !equippedShield && !equippedArmor && <p className="text-sm text-ink-light font-body">Sin equipo.</p>}
          </div>
        </div>

        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink-light mb-2">Mochila</p>
          {backpackItems.length === 0 ? (
            <p className="text-sm text-ink-light font-body">Vacía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {backpackItems.map(({ id, item }) => item && (
                <div key={id} className="border border-border p-3 text-sm font-body flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{item.name}</span>
                  <button type="button" onClick={() => equipFromBackpack(id)} className="font-label text-2xs uppercase text-brass hover:text-brass-bright shrink-0">Equipar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="border border-border bg-parchment/60 px-3 py-2 text-sm text-ink font-body flex-1 min-w-[10rem]">
          <option value="">Comprar equipo…</option>
          {shopOptions.map((i) => <option key={i.id} value={i.id}>{i.name} — {i.cost}z</option>)}
        </select>
        <button type="button" onClick={buy} disabled={!shopId} className="font-label text-xs uppercase tracking-wide border border-brass/50 px-3 py-2 text-brass hover:bg-brass/10 transition-colors disabled:opacity-30">
          Comprar
        </button>
      </div>
      <p className="font-label mt-4 text-sm text-brass-bright">{character.zenit} z <span className="text-ink-light font-body text-xs">({spent}z equipados)</span></p>
    </Accordion>
  );
}

function GlossaryFooter() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mt-6 text-center">
      <button type="button" onClick={() => setOpen((o) => !o)} className="font-label text-2xs uppercase tracking-widest text-parchment-dark hover:text-parchment inline-flex items-center gap-1.5">
        <Info size={13} /> Glosario
      </button>
      {open && (
        <div className="surface-parchment p-4 mt-2 text-left max-w-md mx-auto">
          {glossary.map((g) => (
            <p key={g.term} className="font-body text-xs text-ink-light mb-2 last:mb-0">
              <span className="font-semibold text-ink">{g.term}:</span> {g.definition}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function CharacterSheet({
  character,
  portraitUrl,
  fullBodyUrl,
  backHref,
  onUpdate,
  onImagesChange,
  guildStanding,
}: {
  character: FUCharacter;
  portraitUrl: string | null;
  fullBodyUrl: string | null;
  backHref: string;
  onUpdate: (updated: FUCharacter) => void;
  onImagesChange: (portraitUrl: string | null, fullBodyUrl: string | null) => void;
  guildStanding?: React.ReactNode;
}) {
  const classes = character.classLevels.map((cl) => classesById[cl.classId]).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const current = currentAttributes(character.attributes, character.statusEffects);
  const stats = calcDerivedStats(character.attributes, character.equipment, classes, character.statusEffects);
  const inCrisis = character.currentHp <= stats.crisis.value;
  const canLevelUp = character.xp >= XP_PER_LEVEL && character.classLevels.length > 0 && character.classLevels.some((cl) => cl.levels < MAX_CLASS_LEVEL);
  const [uploadingPortrait, setUploadingPortrait] = React.useState(false);

  async function uploadImage(file: File, kind: "portrait" | "full_body") {
    setUploadingPortrait(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
      <Link href={backHref} className="font-label text-xs uppercase tracking-widest text-parchment-dark hover:text-parchment">
        ← Mis personajes
      </Link>

      <header className="surface-parchment p-6">
        <div className="flex items-start gap-4">
          <div className="relative size-16 shrink-0 rounded-full border border-brass/40 overflow-hidden bg-parchment-dark/30 flex items-center justify-center">
            {portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
              <img src={portraitUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={24} className="text-leather-light" />
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-ink/0 hover:bg-ink/50 text-transparent hover:text-parchment transition-colors cursor-pointer text-2xs font-label uppercase text-center">
              {uploadingPortrait ? "…" : "Cambiar"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "portrait")} />
            </label>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="font-display text-3xl font-extrabold text-ink lg:text-4xl">{character.name || "Héroe sin nombre"}</h1>
              <span className="font-label rounded-full border border-brass/50 px-4 py-1.5 text-xs uppercase tracking-wide text-brass">NV {character.level}</span>
            </div>
            {character.pronouns && <p className="mt-1 text-xs text-ink-light font-body">{character.pronouns}</p>}
            <div className="mt-4 grid gap-1 sm:grid-cols-3">
              <p className="text-sm text-ink font-body"><span className="font-label text-moss">Identidad </span>{character.identity}</p>
              <p className="text-sm text-ink font-body"><span className="font-label text-moss">Tema </span>{character.theme}</p>
              <p className="text-sm text-ink font-body"><span className="font-label text-moss">Origen </span>{character.origin}</p>
            </div>
            {character.appearance && <p className="mt-4 text-sm italic leading-relaxed text-ink-light font-body">{character.appearance}</p>}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex items-center justify-between font-label text-xs uppercase tracking-wide text-ink-light">
            <span>XP: {character.xp} / {XP_PER_LEVEL}</span>
            {canLevelUp && <span className="text-brass-bright">¡Podés subir de nivel!</span>}
          </div>
          <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-parchment-dark/40">
            <div className="h-full rounded-full bg-brass transition-all duration-500" style={{ width: `${Math.min(100, (character.xp / XP_PER_LEVEL) * 100)}%` }} />
          </div>
          {canLevelUp && (
            <LevelUpControl character={character} onLevelUp={levelUp} />
          )}
        </div>

        {guildStanding}
      </header>

      <div className="space-y-6">
        <CockpitCard title="Vitalidad">
          <div className="space-y-4">
            <div>
              <StatBar label="Puntos de Vida" value={character.currentHp} max={stats.hp.value} color="moss" markerAt={stats.crisis.value} />
              <div className="mt-1.5 flex items-center justify-between">
                {inCrisis ? (
                  <span className="font-label text-2xs uppercase tracking-wide text-crimson font-bold">● Crisis</span>
                ) : <span />}
                <Adjuster value={character.currentHp} max={stats.hp.value} onChange={(v) => onUpdate({ ...character, currentHp: v, updatedAt: new Date().toISOString() })} />
              </div>
            </div>
            <div>
              <StatBar label="Puntos de Mente" value={character.currentMp} max={stats.mp.value} color="brass" />
              <div className="mt-1.5 flex justify-end">
                <Adjuster value={character.currentMp} max={stats.mp.value} onChange={(v) => onUpdate({ ...character, currentMp: v, updatedAt: new Date().toISOString() })} />
              </div>
            </div>
            <div>
              <StatBar label="Puntos de Inventario" value={character.currentIp} max={stats.ip.value} color="brass" />
              <div className="mt-1.5 flex justify-end">
                <Adjuster value={character.currentIp} max={stats.ip.value} onChange={(v) => onUpdate({ ...character, currentIp: v, updatedAt: new Date().toISOString() })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <StatTile label="Defensa" value={stats.defense.value} />
              <StatTile label="Def. Mágica" value={stats.magicDefense.value} />
              <StatTile label="Iniciativa" value={stats.initiative.value} />
              <StatTile label="Zenit" value={character.zenit} />
            </div>

            {(() => {
              const weapon = character.equipment.weapons[0] ? findEquipmentItem(character.equipment.weapons[0]) : null;
              return (
                <div className="border border-border p-3 text-sm font-body">
                  <span className="font-label text-2xs uppercase tracking-wide text-ink-light">Ataque básico</span>
                  {weapon && "accuracy" in weapon ? (
                    <p className="text-ink mt-0.5">{weapon.name}: {weapon.accuracy} → {weapon.damage}</p>
                  ) : (
                    <p className="text-ink mt-0.5">Desarmado: 【DEX + VIG】 → 【HR】físico</p>
                  )}
                </div>
              );
            })()}

            <div className="pt-2">
              <p className="font-label text-xs uppercase tracking-wide text-ink-light mb-2">Objetos de inventario</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {ipItems.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    disabled={character.currentIp < item.ipCost}
                    onClick={() => {
                      let updated = { ...character, currentIp: character.currentIp - item.ipCost };
                      if (item.name === "Remedio") updated = { ...updated, currentHp: Math.min(stats.hp.value, updated.currentHp + 50) };
                      if (item.name === "Elixir") updated = { ...updated, currentMp: Math.min(stats.mp.value, updated.currentMp + 50) };
                      onUpdate({ ...updated, updatedAt: new Date().toISOString() });
                    }}
                    className="border border-border p-2.5 text-left text-xs font-body disabled:opacity-30 hover:border-brass transition-colors"
                  >
                    <div className="font-semibold text-ink">{item.name} ({item.ipCost} PI)</div>
                    <div className="text-ink-light mt-0.5">{item.effect}</div>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-2xs text-ink-light font-body">
                Los objetos son ejemplos de referencia — tu mesa puede definir otros con tu DM.
              </p>
            </div>

            <p className="font-label text-xs text-ink-light">Crisis: la mitad de tu PV máximo, redondeado hacia abajo.</p>
          </div>
        </CockpitCard>

        <AttributesAndStatusPanel character={character} current={current} onUpdate={onUpdate} />
        <FabulaPointsPanel character={character} onUpdate={onUpdate} />
      </div>

      <div className="space-y-4">
        <ActionsAccordion character={character} onUpdate={onUpdate} />
        <EquipmentAccordion character={character} onUpdate={onUpdate} />
        <AffinitiesAccordion character={character} onUpdate={onUpdate} />
        <ClassesAccordion character={character} />
        <BondsAccordion character={character} onUpdate={onUpdate} />
        <TraitsAccordion character={character} onUpdate={onUpdate} />
      </div>

      <GlossaryFooter />
      <CharacterFullBodyDrawer imageUrl={fullBodyUrl} />
    </div>
  );
}

function LevelUpControl({ character, onLevelUp }: { character: FUCharacter; onLevelUp: (classId: string, skillName: string) => void }) {
  const eligibleClasses = character.classLevels.filter((cl) => cl.levels < MAX_CLASS_LEVEL);
  const [classId, setClassId] = React.useState(eligibleClasses[0]?.classId ?? "");
  const cls = classId ? classesById[classId] : undefined;
  const [skillName, setSkillName] = React.useState("");

  const skillOptions = cls?.skills.filter((s) => {
    const cl = character.classLevels.find((c) => c.classId === classId);
    const taken = (cl?.skillsTaken ?? []).filter((n) => n === s.name).length;
    return taken < s.maxLevel;
  }) ?? [];

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="font-label text-2xs uppercase tracking-wide text-ink-light">Clase</label>
        <select value={classId} onChange={(e) => { setClassId(e.target.value); setSkillName(""); }} className="mt-1 w-full border border-border bg-parchment/60 px-3 py-2 text-sm text-ink font-body">
          {eligibleClasses.map((cl) => <option key={cl.classId} value={cl.classId}>{classesById[cl.classId]?.name}</option>)}
        </select>
      </div>
      <div className="flex-1">
        <label className="font-label text-2xs uppercase tracking-wide text-ink-light">Nueva habilidad</label>
        <select value={skillName} onChange={(e) => setSkillName(e.target.value)} className="mt-1 w-full border border-border bg-parchment/60 px-3 py-2 text-sm text-ink font-body">
          <option value="">Elegí…</option>
          {skillOptions.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
      </div>
      <button
        type="button"
        disabled={!classId || !skillName}
        onClick={() => classId && skillName && onLevelUp(classId, skillName)}
        className="font-label text-xs uppercase tracking-wide border border-brass bg-brass/10 px-4 py-2 text-brass-bright hover:bg-brass/20 transition-colors disabled:opacity-30"
      >
        Subir de nivel
      </button>
    </div>
  );
}
