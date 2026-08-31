"use client";

import * as React from "react";
import Link from "next/link";
import {
  User, Info, Dices, Sword, Backpack, Shield, Hand, FlaskConical, Wand2, Trophy, Eye, Star,
  Zap, Building2, Coins, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion } from "@/components/ui/Accordion";
import { Modal } from "@/components/ui/Modal";
import { bondEmotionsById, bondPairings, bondsRulesNote, MAX_BONDS, type BondEmotionId } from "@/app/FU/data/bonds";
import {
  actions, fabulaPointGains, fabulaPointUses, glossary,
  opportunities, criticalFumbleNote, villageServices, villageServicesNote, xpNote,
} from "@/app/FU/data/reference";
import type { AttributeKey } from "@/app/FU/data/statusEffects";
import { elements, affinityStatusOrder, affinityStatusLabels, type AffinityStatus } from "@/app/FU/data/affinities";
import type { FUArmor, FUShield, FUWeapon, FUSpell } from "@/app/FU/data/types";
import {
  calcDerivedStats, currentAttributes, findEquipmentItem, calcSpent,
  XP_PER_LEVEL, MAX_CLASS_LEVEL, MAX_CLASSES,
} from "@/app/FU/lib/derivedStats";
import type { FUBond, FUCharacter, FUCharacterAttributes } from "@/app/FU/lib/types";
import { equipmentCardData, type EquipmentCardData } from "@/app/FU/lib/equipmentDisplay";
import { ReferenceDataProvider, useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import { rollDice, rollCheck, rollAttack } from "@/app/FU/lib/diceRoller";
import { SkillText } from "./SkillText";
import { StatBar } from "./StatBar";
import { toast } from "sonner";

// Spanish display labels for the canonical (English) inventory-item catalog
// — the DB stays in English to match the rulebook, only the visible label
// is translated here, same pattern as the PV/PM/PI labels below over their
// English rule concepts.
const IP_ITEM_LABELS: Record<string, string> = {
  remedy: "Remedio",
  elixir: "Elixir",
  tonic: "Tónico",
  "elemental-shard": "Fragmento elemental",
  "magic-tent": "Carpa mágica",
};

// The 6 status effects are stored in English in the DB (shg_fu_status_effect)
// to match the rulebook — translated for display only, same pattern as
// IP_ITEM_LABELS above.
const STATUS_EFFECT_LABELS: Record<string, string> = {
  dazed: "Aturdido",
  enraged: "Enfurecido",
  poisoned: "Envenenado",
  shaken: "Sacudido",
  slow: "Lento",
  weak: "Débil",
};
function statusLabel(effect: { id: string; name: string }): string {
  return STATUS_EFFECT_LABELS[effect.id] ?? effect.name;
}

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

/** Always-visible titled panel — used by the few sections that don't need to collapse. */
function Panel({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("surface-parchment p-3.5", className)}>
      <h3 className="font-label text-xs font-bold uppercase tracking-widest text-ink mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

/** Filled/empty dots showing how many more levels a repeatable Skill can still take. */
function SkillLevelDots({ current, max }: { current: number; max: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={cn("inline-block size-1.5 rounded-full", i < current ? "bg-brass" : "bg-border")} />
      ))}
    </span>
  );
}

/** Single-step +/- pair, no amount box — for XP, which only ever moves 1 at a time in play. */
function StepAdjuster({ onChange }: { onChange: (delta: number) => void }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button type="button" onClick={() => onChange(-1)} aria-label="Restar" className="flex size-6 items-center justify-center rounded-full border border-brass/60 text-xs leading-none text-ink hover:border-crimson hover:text-crimson">−</button>
      <button type="button" onClick={() => onChange(1)} aria-label="Sumar" className="flex size-6 items-center justify-center rounded-full border border-brass/60 text-xs leading-none text-ink hover:border-moss hover:text-moss">+</button>
    </div>
  );
}

/** Amount box + Add/Remove buttons — lets the player apply any delta to a stat instead of stepping by 1. */
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
        className="w-11 border border-brass/60 bg-parchment/60 px-1 py-1 text-center text-xs text-ink focus:border-brass focus:outline-none font-body"
      />
      <button type="button" onClick={() => apply(-1)} aria-label="Restar" className="flex size-6 items-center justify-center rounded-full border border-brass/60 text-xs leading-none text-ink hover:border-crimson hover:text-crimson">−</button>
      <button type="button" onClick={() => apply(1)} aria-label="Sumar" className="flex size-6 items-center justify-center rounded-full border border-brass/60 text-xs leading-none text-ink hover:border-moss hover:text-moss">+</button>
    </div>
  );
}

/** A corner label overlaid on the full-body portrait — read-only text, or an editable input (only Accessory needs one). */
function EquipTag({ position, label, children }: { position: "tl" | "tr" | "bl" | "br"; label: string; children: React.ReactNode }) {
  const posClasses: Record<typeof position, string> = {
    tl: "top-2 left-2",
    tr: "top-2 right-2 text-right",
    bl: "bottom-2 left-2",
    br: "bottom-2 right-2 text-right",
  };
  return (
    <div className={cn("absolute z-10 max-w-[46%] rounded-sm border border-brass/60 bg-parchment/90 px-2 py-1", posClasses[position])}>
      <span className="block font-label text-[9px] uppercase tracking-wide text-ink-light">{label}</span>
      {children}
    </div>
  );
}

/** A hex/shield-shaped stat readout — Iniciativa/Defensa/Def. Mágica in the vitals rail. */
function CombatBadge({ label, value, shape }: { label: string; value: React.ReactNode; shape: "hex" | "shield" }) {
  const clipPath = shape === "hex"
    ? "polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%)"
    : "polygon(50% 0%,100% 16%,100% 58%,50% 100%,0% 58%,0% 16%)";
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <div style={{ clipPath }} className="flex size-12 items-center justify-center border-2 border-crimson bg-parchment">
        <span className="font-display text-lg text-crimson">{value}</span>
      </div>
      <span className="font-label text-[10px] uppercase tracking-wide text-ink-light">{label}</span>
    </div>
  );
}

/** Every held class's Free Benefit — the always-on passive bonuses from having levels in a class. */
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

// ─── attributes (Combate tab) ─────────────────────────────────────────────

const ATTRIBUTE_ROWS: { key: AttributeKey; label: string }[] = [
  { key: "dexterity", label: "DEX" },
  { key: "insight", label: "INS" },
  { key: "might", label: "MIG" },
  { key: "willpower", label: "WLP" },
];
const ATTRIBUTE_LABELS: Record<AttributeKey, string> = Object.fromEntries(ATTRIBUTE_ROWS.map((r) => [r.key, r.label])) as Record<AttributeKey, string>;
const ATTRIBUTE_PAIRS: [AttributeKey, AttributeKey][] = [
  ["dexterity", "insight"],
  ["might", "willpower"],
];

function StatusToggle({ effect, character, onToggle }: { effect: { id: string; name: string }; character: FUCharacter; onToggle: (id: string) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-ink-light font-body cursor-pointer">
      <input type="checkbox" checked={character.statusEffects.includes(effect.id)} onChange={() => onToggle(effect.id)} className="accent-crimson" />
      {statusLabel(effect)}
    </label>
  );
}

/** One attribute row — the die itself is clickable and throws a 3D die. */
function AttributeRow({ attrKey, character, current, onToggle }: { attrKey: AttributeKey; character: FUCharacter; current: FUCharacterAttributes; onToggle: (id: string) => void }) {
  const ref = useReferenceDataContext();
  const label = ATTRIBUTE_LABELS[attrKey];
  const base = character.attributes[attrKey];
  const curr = current[attrKey];
  const reduced = curr !== base;
  const soloEffects = ref.statusEffects.filter((e) => e.affects.length === 1 && e.affects[0] === attrKey);

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-2 transition-colors", reduced && "bg-crimson/5")}>
      <span className="w-9 shrink-0 font-label text-xs uppercase tracking-wide text-ink-light">{label}</span>
      <button
        type="button"
        onClick={() => rollDice(`1d${curr}`, label)}
        title={`Tirar 1d${curr}`}
        className="w-14 shrink-0 text-left font-display text-xl font-bold text-ink transition-colors hover:text-brass"
      >
        {reduced ? (
          <><span className="mr-1 text-sm text-ink-light line-through">d{base}</span><span className="text-crimson">d{curr}</span></>
        ) : (
          <>d{base}</>
        )}
      </button>
      <div className="flex flex-1 flex-wrap gap-x-3 gap-y-0.5">
        {soloEffects.map((e) => <StatusToggle key={e.id} effect={e} character={character} onToggle={onToggle} />)}
      </div>
    </div>
  );
}

/** DEX+INS and MIG+WLP, each pair sharing a "bracket" toggle for the status effect that reduces both at once (Enraged, Poisoned). */
function AttributePairBlock({ pair, character, current, onToggle }: { pair: [AttributeKey, AttributeKey]; character: FUCharacter; current: FUCharacterAttributes; onToggle: (id: string) => void }) {
  const ref = useReferenceDataContext();
  const [a, b] = pair;
  const sharedEffects = ref.statusEffects.filter((e) => e.affects.length > 1 && e.affects.includes(a) && e.affects.includes(b));

  return (
    <div className="rounded-sm border border-border">
      <div className="divide-y divide-border/60">
        <AttributeRow attrKey={a} character={character} current={current} onToggle={onToggle} />
        <AttributeRow attrKey={b} character={character} current={current} onToggle={onToggle} />
      </div>
      {sharedEffects.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-border/60 px-2.5 py-1.5">
          {sharedEffects.map((e) => <StatusToggle key={e.id} effect={e} character={character} onToggle={onToggle} />)}
        </div>
      )}
    </div>
  );
}

function AttributesSection({ character, current, onUpdate }: { character: FUCharacter; current: FUCharacterAttributes; onUpdate: (updated: FUCharacter) => void }) {
  function toggle(id: string) {
    const active = character.statusEffects.includes(id);
    const next = active ? character.statusEffects.filter((e) => e !== id) : [...character.statusEffects, id];
    onUpdate({ ...character, statusEffects: next, updatedAt: new Date().toISOString() });
  }
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {ATTRIBUTE_PAIRS.map((pair) => (
        <AttributePairBlock key={pair.join("-")} pair={pair} character={character} current={current} onToggle={toggle} />
      ))}
    </div>
  );
}

// ─── actions grid (Combate tab) ────────────────────────────────────────────

const ACTION_ICONS: Record<string, LucideIcon> = {
  "Ataque": Sword, "Equipo": Backpack, "Guardia": Shield, "Obstaculizar": Hand,
  "Inventario": FlaskConical, "Hechizo": Wand2, "Objetivo": Trophy, "Estudiar": Eye, "Habilidad": Star,
};

function ActionGrid() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map((a) => {
        const Icon = ACTION_ICONS[a.name] ?? Star;
        return (
          <div
            key={a.name}
            title={a.description}
            className="flex flex-col items-center gap-1 rounded-sm border border-border bg-parchment-dark/10 px-2 py-2.5 text-center transition-colors hover:border-brass"
          >
            <Icon size={18} className="text-crimson" />
            <span className="font-body text-2xs text-ink">{a.name}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── weapon card + attack (Combate tab) ────────────────────────────────────

// Weapon accuracy formulas use these 3-letter attribute tokens (e.g. "【DEX + INS】+1").
const ATTACK_TOKEN_TO_ATTRIBUTE: Record<string, AttributeKey> = { DEX: "dexterity", INS: "insight", MIG: "might", WLP: "willpower" };

/** Substitutes each attribute token in an accuracy formula with its current (status-effect-adjusted) die size, keeping the token itself visible — "【DEX + INS】+1" → "【DEX d8 + INS d10】+1". */
function resolveAccuracyFormula(formula: string, current: FUCharacterAttributes): string {
  return formula.replace(/\b(DEX|INS|MIG|WLP)\b/g, (token) => {
    const key = ATTACK_TOKEN_TO_ATTRIBUTE[token];
    return key ? `${token} d${current[key]}` : token;
  });
}

/** Parses a "【DEX + INS】+1"-shaped accuracy formula into its two attribute tokens and flat modifier. */
function parseAccuracyFormula(formula: string): { tokens: string[]; modifier: number } {
  const m = formula.match(/【\s*([A-Z]+)\s*\+\s*([A-Z]+)\s*】\s*([+-]\d+)?/);
  if (!m) return { tokens: [], modifier: 0 };
  return { tokens: [m[1], m[2]], modifier: m[3] ? Number(m[3]) : 0 };
}

/** Parses a "【HR + 6】physical"-shaped damage formula into the HR bonus and damage type. */
function parseDamageFormula(formula: string): { bonus: number; type: string } {
  const m = formula.match(/【\s*HR\s*\+\s*(-?\d+)\s*】\s*(.*)/);
  return { bonus: m ? Number(m[1]) : 0, type: m ? m[2].trim() : "" };
}

/** One equipped weapon (or Unarmed Strike, falling back). Clicking "Atacar" throws both accuracy dice once and derives both the accuracy total and the damage total from that single roll (HR). */
function WeaponCard({ w, current }: { w: FUWeapon; current: FUCharacterAttributes }) {
  function attack() {
    const { tokens, modifier } = parseAccuracyFormula(w.accuracy);
    if (tokens.length < 2) return;
    const { bonus, type } = parseDamageFormula(w.damage);
    rollAttack({
      weaponName: w.name,
      accTokens: tokens.map((t) => ({ label: t, die: current[ATTACK_TOKEN_TO_ATTRIBUTE[t]] })),
      accModifier: modifier,
      damageBonus: bonus,
      damageType: type,
    });
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-brass/60 bg-leather p-3.5 text-parchment">
      <h3 className="font-display text-base text-brass-light">{w.name}</h3>
      <div className="flex justify-between gap-3 font-body text-xs"><span className="shrink-0 text-brass-light">Precisión</span><span className="text-right">{resolveAccuracyFormula(w.accuracy, current)}</span></div>
      <div className="flex justify-between gap-3 font-body text-xs"><span className="shrink-0 text-brass-light">Daño</span><span className="text-right">{w.damage}</span></div>
      {w.notes && <div className="flex justify-between gap-3 font-body text-xs"><span className="shrink-0 text-brass-light">Notas</span><span className="text-right">{w.notes}</span></div>}
      <button
        type="button"
        onClick={attack}
        className="mt-1 rounded-sm border border-brass-light bg-crimson px-3 py-2 font-label text-xs font-semibold uppercase tracking-wide text-crimson-foreground transition-colors hover:bg-crimson/85"
      >
        Atacar con {w.name}
      </button>
    </div>
  );
}

function WeaponCards({ character, current }: { character: FUCharacter; current: FUCharacterAttributes }) {
  const ref = useReferenceDataContext();
  const equippedWeapons = character.equipment.weapons
    .map((id) => ref.weapons.find((w) => w.id === id))
    .filter((w): w is NonNullable<typeof w> => Boolean(w));
  const unarmed = ref.weapons.find((w) => w.id === "unarmed-strike");
  const displayWeapons = equippedWeapons.length > 0 ? equippedWeapons : unarmed ? [unarmed] : [];

  if (displayWeapons.length === 0) return <p className="text-sm text-ink-light font-body">Sin arma equipada.</p>;
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {displayWeapons.map((w) => <WeaponCard key={w.id} w={w} current={current} />)}
    </div>
  );
}

// ─── skills + spells table (Combate tab) ───────────────────────────────────

/**
 * Some spells have a fixed MP cost ("10"), others a formula that depends on
 * choices made when casting ("5 × T" — T = number of targets) — the input
 * pre-fills with the fixed cost when there is one (one click still works)
 * but stays editable either way.
 */
function SpellActionCell({ spell, current, currentMp, onCast }: { spell: FUSpell; current: FUCharacterAttributes; currentMp: number; onCast: (mpCost: number) => void }) {
  const numericCost = Number(spell.mpCost);
  const fixed = Number.isFinite(numericCost) && numericCost > 0;
  const [cost, setCost] = React.useState(fixed ? String(numericCost) : "");

  return (
    <div className="flex items-center justify-end gap-1">
      {spell.offensive && (
        <button
          type="button"
          onClick={() => rollCheck(
            [{ label: "INS", die: current.insight }, { label: "WLP", die: current.willpower }],
            0,
            `${spell.name} — Check Mágico`
          )}
          title="Tirar Check Mágico (INS + WLP)"
          className="rounded-sm border border-brass/50 p-1 text-brass transition-colors hover:bg-brass/10"
        >
          <Dices className="h-3.5 w-3.5" />
        </button>
      )}
      <input
        type="number"
        min={0}
        max={currentMp}
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        placeholder="PM"
        className="w-12 border border-border bg-parchment/60 px-1 py-0.5 text-xs text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body"
      />
      <button
        type="button"
        onClick={() => { const n = Number(cost) || 0; if (n > 0) { onCast(n); if (!fixed) setCost(""); } }}
        className="whitespace-nowrap font-label text-2xs uppercase tracking-wide border border-brass/50 px-2 py-0.5 text-brass transition-colors hover:bg-brass/10"
      >
        Lanzar
      </button>
    </div>
  );
}

interface ActiveAbilityRow {
  key: string;
  name: string;
  level?: { current: number; max: number };
  cost: string;
  target: string;
  duration: string;
  effect: React.ReactNode;
  action?: React.ReactNode;
}

/** Every taken Skill (full text, 【SL】resolved) and every Spell from a caster class, in one table — merges what used to be two separate panels. */
function ActiveAbilitiesTable({ character, current, onUpdate }: { character: FUCharacter; current: FUCharacterAttributes; onUpdate: (updated: FUCharacter) => void }) {
  const ref = useReferenceDataContext();

  function spendMp(amount: number) {
    onUpdate({ ...character, currentMp: Math.max(0, character.currentMp - amount), updatedAt: new Date().toISOString() });
  }

  const rows: ActiveAbilityRow[] = [];
  for (const cl of character.classLevels) {
    const cls = ref.classesById[cl.classId];
    if (!cls) continue;

    const counts = new Map<string, number>();
    for (const name of cl.skillsTaken) counts.set(name, (counts.get(name) ?? 0) + 1);
    for (const [name, count] of Array.from(counts.entries())) {
      const skill = cls.skills.find((s) => s.name === name);
      if (!skill) continue;
      rows.push({
        key: `${cl.classId}-skill-${name}`,
        name,
        level: skill.maxLevel > 1 ? { current: count, max: skill.maxLevel } : undefined,
        cost: "—",
        target: "—",
        duration: "—",
        effect: <SkillText text={skill.text} skillLevel={count} />,
      });
    }

    if (cls.subsystem?.type === "spells") {
      for (const spell of cls.subsystem.entries) {
        rows.push({
          key: `${cl.classId}-spell-${spell.name}`,
          name: spell.name,
          cost: `${spell.mpCost} PM`,
          target: spell.target,
          duration: spell.duration,
          effect: <SkillText text={spell.text} />,
          action: <SpellActionCell spell={spell} current={current} currentMp={character.currentMp} onCast={spendMp} />,
        });
      }
    }
  }

  if (rows.length === 0) return <p className="text-sm text-ink-light font-body">Todavía sin habilidades ni hechizos.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b-2 border-brass px-2 py-1.5 text-left font-label text-2xs uppercase tracking-wide text-ink-light">Nombre</th>
            <th className="border-b-2 border-brass px-2 py-1.5 text-left font-label text-2xs uppercase tracking-wide text-ink-light">Costo</th>
            <th className="hidden border-b-2 border-brass px-2 py-1.5 text-left font-label text-2xs uppercase tracking-wide text-ink-light sm:table-cell">Objetivo</th>
            <th className="hidden border-b-2 border-brass px-2 py-1.5 text-left font-label text-2xs uppercase tracking-wide text-ink-light sm:table-cell">Duración</th>
            <th className="border-b-2 border-brass px-2 py-1.5 text-left font-label text-2xs uppercase tracking-wide text-ink-light">Efecto</th>
            <th className="border-b-2 border-brass px-2 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border/60 align-top last:border-b-0">
              <td className="whitespace-nowrap px-2 py-2 font-body text-sm font-semibold text-crimson">
                {r.name}{r.level && <span className="ml-1.5 font-label text-2xs font-normal text-ink-light">Nv {r.level.current}/{r.level.max}</span>}
              </td>
              <td className="whitespace-nowrap px-2 py-2 font-body text-xs text-ink-light">{r.cost}</td>
              <td className="hidden px-2 py-2 font-body text-xs text-ink-light sm:table-cell">{r.target}</td>
              <td className="hidden px-2 py-2 font-body text-xs text-ink-light sm:table-cell">{r.duration}</td>
              <td className="px-2 py-2 font-body text-xs leading-snug text-ink">{r.effect}</td>
              <td className="px-2 py-2">{r.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── inventory tab ──────────────────────────────────────────────────────────

function OtherItemsNote({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  const [text, setText] = React.useState(character.otherItemsNote);
  const dirty = text !== character.otherItemsNote;

  return (
    <div>
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

function EquipRow({ item, equipped, onToggle }: { item: EquipmentCardData; equipped: boolean; onToggle: () => void }) {
  return (
    <tr className={cn("border-b border-border/60 last:border-b-0", equipped && "bg-brass/5")}>
      <td className={cn("px-2 py-2 font-body text-sm", equipped ? "font-semibold text-crimson" : "text-ink")}>{item.name}</td>
      <td className="px-2 py-2 font-body text-xs text-moss">{item.statLine}</td>
      <td className="whitespace-nowrap px-2 py-2 font-body text-xs text-ink-light">{item.cost != null ? `${item.cost}z` : "—"}</td>
      <td className="hidden px-2 py-2 font-body text-xs text-ink-light sm:table-cell">{item.notes}</td>
      <td className="px-2 py-2 text-right">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "whitespace-nowrap rounded-sm border px-2 py-1 font-label text-2xs uppercase tracking-wide transition-colors",
            equipped ? "border-crimson text-crimson hover:bg-crimson/10" : "border-border text-ink hover:border-brass"
          )}
        >
          {equipped ? "Quitar" : "Equipar"}
        </button>
      </td>
    </tr>
  );
}

interface EquippedRefs {
  mainHand?: FUWeapon | FUArmor | FUShield;
  offHandItem?: FUWeapon | FUArmor | FUShield;
  offHandWeapon?: FUWeapon | FUArmor | FUShield;
  equippedShield?: FUWeapon | FUArmor | FUShield;
  equippedArmor?: FUWeapon | FUArmor | FUShield;
  isTwoHanded: boolean;
}

function InventoryTab({ character, onUpdate, equipped }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void; equipped: EquippedRefs }) {
  const ref = useReferenceDataContext();
  const stats = calcDerivedStats(
    character.level, character.attributes, character.equipment,
    character.classLevels.map((cl) => ref.classesById[cl.classId]).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    character.statusEffects, ref
  );
  const backpackItems = character.backpack.map((id) => ({ id, item: findEquipmentItem(id, ref) }));
  const spent = calcSpent(character.equipment, ref);
  const [shopId, setShopId] = React.useState("");

  function adjustIp(delta: number) {
    onUpdate({ ...character, currentIp: Math.max(0, Math.min(stats.ip.value, character.currentIp + delta)), updatedAt: new Date().toISOString() });
  }
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
        backpack.push(...equipment.weapons.filter((wid) => wid !== id), ...(equipment.shield ? [equipment.shield] : []));
        equipment.weapons = [id];
        equipment.shield = undefined;
      } else if (equippedTwoHanded) {
        backpack.push(...equipment.weapons);
        equipment.weapons = [id];
      } else if (equipment.weapons.length >= 2) {
        return;
      } else if (equipment.weapons.length === 1) {
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

  const equippedRows: { item: EquipmentCardData; onToggle: () => void }[] = [];
  if (equipped.mainHand) equippedRows.push({ item: equipmentCardData(equipped.mainHand), onToggle: () => moveToBackpack("weapon", equipped.mainHand!.id) });
  if (equipped.offHandItem) equippedRows.push({ item: equipmentCardData(equipped.offHandItem), onToggle: () => moveToBackpack(equipped.offHandWeapon ? "weapon" : "shield", equipped.offHandItem!.id) });
  if (equipped.equippedArmor) equippedRows.push({ item: equipmentCardData(equipped.equippedArmor), onToggle: () => moveToBackpack("armor", equipped.equippedArmor!.id) });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brass bg-parchment-dark/20 px-3.5 py-2.5">
        <span className="font-label text-xs uppercase tracking-wide text-ink-light">Puntos de Inventario</span>
        <span className="font-display text-lg text-ink">{character.currentIp} / {stats.ip.value}</span>
        <AmountAdjuster onApply={adjustIp} />
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 border-b border-brass/40 pb-1.5 font-label text-xs uppercase tracking-wide text-ink-light">
          <FlaskConical size={14} className="text-crimson" /> Acciones de inventario
        </h3>
        <div className="divide-y divide-border/60">
          {ref.ipItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 py-2">
              <span className="font-body text-sm text-ink">{IP_ITEM_LABELS[item.id] ?? item.name}</span>
              <span className="font-body text-2xs text-ink-light" title={item.effect}>Costo {item.ipCost}</span>
              <button
                type="button"
                disabled={character.currentIp < item.ipCost}
                onClick={() => {
                  let updated = { ...character, currentIp: character.currentIp - item.ipCost };
                  if (item.id === "remedy") updated = { ...updated, currentHp: Math.min(stats.hp.value, updated.currentHp + 50) };
                  if (item.id === "elixir") updated = { ...updated, currentMp: Math.min(stats.mp.value, updated.currentMp + 50) };
                  onUpdate({ ...updated, updatedAt: new Date().toISOString() });
                }}
                className="font-label text-2xs uppercase tracking-wide border border-crimson px-3 py-1 text-crimson transition-colors hover:bg-crimson hover:text-crimson-foreground disabled:opacity-30"
              >
                Usar
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 border-b border-brass/40 pb-1.5 font-label text-xs uppercase tracking-wide text-ink-light">
          <Backpack size={14} className="text-crimson" /> Equipo ({equippedRows.length + backpackItems.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b-2 border-brass px-2 py-1.5 text-left font-label text-2xs uppercase tracking-wide text-ink-light">Nombre</th>
                <th className="border-b-2 border-brass px-2 py-1.5 text-left font-label text-2xs uppercase tracking-wide text-ink-light">Stats</th>
                <th className="border-b-2 border-brass px-2 py-1.5 text-left font-label text-2xs uppercase tracking-wide text-ink-light">Costo</th>
                <th className="hidden border-b-2 border-brass px-2 py-1.5 text-left font-label text-2xs uppercase tracking-wide text-ink-light sm:table-cell">Notas</th>
                <th className="border-b-2 border-brass px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {equippedRows.map(({ item, onToggle }) => <EquipRow key={item.id} item={item} equipped onToggle={onToggle} />)}
              {backpackItems.map(({ id, item }) => item && (
                <EquipRow key={id} item={equipmentCardData(item)} equipped={false} onToggle={() => equipFromBackpack(id)} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="min-w-[8rem] flex-1 border border-border bg-parchment/60 px-2 py-1 text-xs text-ink font-body">
            <option value="">Comprar…</option>
            {shopOptions.map((i) => <option key={i.id} value={i.id}>{i.name} — {i.cost}z</option>)}
          </select>
          <button type="button" onClick={buy} disabled={!shopId} className="font-label text-2xs uppercase tracking-wide border border-brass/50 px-2 py-1 text-brass hover:bg-brass/10 transition-colors disabled:opacity-30">
            Comprar
          </button>
        </div>
      </div>

      <OtherItemsNote character={character} onUpdate={onUpdate} />

      <div className="flex items-center justify-end gap-2.5 rounded-md border border-brass bg-parchment-dark/20 px-3.5 py-2.5">
        <span className="flex size-7 items-center justify-center rounded-full border border-brass bg-brass-light text-leather"><Coins size={14} /></span>
        <span className="font-label text-xs uppercase tracking-wide text-ink-light">Zenit</span>
        <span className="font-display text-lg text-ink">{character.zenit}z</span>
        <span className="font-body text-2xs text-ink-light">({spent}z eq.)</span>
        <AmountAdjuster onApply={adjustZenit} />
      </div>
    </div>
  );
}

// ─── bonds tab ──────────────────────────────────────────────────────────────

function BondRow({ bond, onChange, onRemove }: { bond: FUBond; onChange: (bond: FUBond) => void; onRemove: () => void }) {
  function toggle(pair: [BondEmotionId, BondEmotionId], emotionId: BondEmotionId) {
    const [a, b] = pair;
    const isActive = bond.emotions.includes(emotionId);
    const withoutPair = bond.emotions.filter((e) => e !== a && e !== b);
    onChange({ ...bond, emotions: isActive ? withoutPair : [...withoutPair, emotionId] });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-parchment-dark/10 px-3.5 py-2.5">
      <input
        value={bond.name}
        onChange={(e) => onChange({ ...bond, name: e.target.value })}
        placeholder="Nombre"
        className="min-w-[9rem] flex-1 border-b border-border bg-transparent px-0.5 py-1 font-body text-sm text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none"
      />
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="font-label text-2xs text-ink-light">Nivel</span>
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => <span key={i} className={cn("size-2.5 rounded-full border border-crimson", i < bond.emotions.length && "bg-crimson")} />)}
        </span>
      </span>
      <div className="flex flex-1 flex-wrap gap-x-3 gap-y-1">
        {bondPairings.map((pair) => pair.map((emotionId) => {
          const emotion = bondEmotionsById[emotionId];
          const active = bond.emotions.includes(emotionId);
          return (
            <label key={emotionId} className="flex cursor-pointer items-center gap-1 font-body text-2xs text-ink-light">
              <input type="checkbox" checked={active} onChange={() => toggle(pair, emotionId)} className="accent-crimson" />
              {emotion.name}
            </label>
          );
        }))}
      </div>
      <button type="button" onClick={onRemove} aria-label="Quitar Vínculo" className="shrink-0 text-sm text-leather-light hover:text-crimson">✕</button>
    </div>
  );
}

function BondsTab({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
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
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 border-b border-brass/40 pb-1.5 font-label text-xs uppercase tracking-wide text-ink-light">
        Vínculos <span className="font-body text-2xs normal-case text-ink-light">({character.bonds.length}/{MAX_BONDS})</span>
      </h3>
      {character.bonds.length === 0 ? (
        <p className="text-sm text-ink-light font-body">Todavía no hay Vínculos.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {character.bonds.map((bond, i) => <BondRow key={i} bond={bond} onChange={(b) => updateBond(i, b)} onRemove={() => removeBond(i)} />)}
        </div>
      )}
      <button
        type="button"
        onClick={addBond}
        disabled={character.bonds.length >= MAX_BONDS}
        className="w-full rounded-md border border-dashed border-brass px-3 py-2.5 font-body text-sm text-ink-light transition-colors hover:bg-brass/5 disabled:opacity-30"
      >
        + Añadir vínculo
      </button>
      <p className="text-2xs leading-relaxed text-ink-light font-body">{bondsRulesNote}</p>
    </div>
  );
}

// ─── "personaje" tab (classes, heroic skills, affinities, traits) ─────────

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
    <Accordion title="Clases y habilidades" summary={`${character.classLevels.length} clase(s)`} defaultOpen>
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
              <div className="mt-1 space-y-1">
                {Array.from(counts.entries()).map(([name, count]) => {
                  const skill = cls.skills.find((s) => s.name === name);
                  const max = skill?.maxLevel ?? 1;
                  return (
                    <div key={name} className="flex items-center justify-between gap-2 text-xs text-ink font-body">
                      <span>{name}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="font-label text-2xs text-ink-light">Nv {count}</span>
                        {max > 1 && <SkillLevelDots current={count} max={max} />}
                      </span>
                    </div>
                  );
                })}
              </div>
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
 * of Heroic Skill — modeled as a derived "earned vs. spent" count.
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

function PersonajeTab({ character, onUpdate, guildStanding }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void; guildStanding?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <ClassesAccordion character={character} onUpdate={onUpdate} />
      <HeroicSkillsAccordion character={character} onUpdate={onUpdate} />
      <AffinitiesAccordion character={character} onUpdate={onUpdate} />
      <PassivesPanel character={character} />
      <TraitsGuildAccordion character={character} onUpdate={onUpdate} guildStanding={guildStanding} />
    </div>
  );
}

// ─── level up (vitals rail) ────────────────────────────────────────────────

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
    <div className="flex flex-col gap-1.5">
      <select value={classId} onChange={(e) => { setClassId(e.target.value); setSkillName(""); }} className="border border-brass/60 bg-parchment/60 px-2 py-1 text-xs text-ink font-body">
        {eligibleClasses.map((cl) => <option key={cl.classId} value={cl.classId}>{ref.classesById[cl.classId]?.name}</option>)}
      </select>
      <select value={skillName} onChange={(e) => setSkillName(e.target.value)} className="border border-brass/60 bg-parchment/60 px-2 py-1 text-xs text-ink font-body">
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

// ─── vitals rail ────────────────────────────────────────────────────────────

interface VitalsRailProps {
  character: FUCharacter;
  stats: ReturnType<typeof calcDerivedStats>;
  inCrisis: boolean;
  canLevelUp: boolean;
  fullBodyUrl: string | null;
  uploadingImage: boolean;
  onUploadFullBody: (file: File) => void;
  equipped: EquippedRefs;
  onUpdate: (updated: FUCharacter) => void;
  onLevelUp: (classId: string, skillName: string) => void;
  onAdjustHp: (delta: number) => void;
  onAdjustMp: (delta: number) => void;
  onAdjustXp: (delta: number) => void;
  onOpenModal: (modal: "opportunities" | "services") => void;
}

function VitalsRail({
  character, stats, inCrisis, canLevelUp, fullBodyUrl, uploadingImage, onUploadFullBody,
  equipped, onUpdate, onLevelUp, onAdjustHp, onAdjustMp, onAdjustXp, onOpenModal,
}: VitalsRailProps) {
  const [fpModalOpen, setFpModalOpen] = React.useState(false);
  const [xpModalOpen, setXpModalOpen] = React.useState(false);

  function adjustFp(delta: number) {
    onUpdate({ ...character, fabulaPoints: Math.max(0, character.fabulaPoints + delta), updatedAt: new Date().toISOString() });
  }

  return (
    <aside className="flex flex-col gap-3.5 surface-parchment p-3.5 md:sticky md:top-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border-2 border-brass bg-parchment-deep/50">
        {fullBodyUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
          <img src={fullBodyUrl} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center font-body text-xs text-ink-light">Retrato de cuerpo completo</div>
        )}
        <label className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center bg-ink/0 text-center font-label text-2xs uppercase text-transparent transition-colors hover:bg-ink/50 hover:text-parchment">
          {uploadingImage ? "…" : "Cambiar"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadFullBody(e.target.files[0])} />
        </label>

        <EquipTag position="tl" label="Accesorio">
          <input
            value={character.equipment.accessory}
            onChange={(e) => onUpdate({ ...character, equipment: { ...character.equipment, accessory: e.target.value }, updatedAt: new Date().toISOString() })}
            placeholder="Libre"
            onClick={(e) => e.stopPropagation()}
            className="relative z-30 block w-full bg-transparent font-body text-2xs font-semibold text-crimson placeholder:font-normal placeholder:italic placeholder:text-ink-light focus:outline-none"
          />
        </EquipTag>
        <EquipTag position="tr" label="Armadura">
          <span className={cn("block text-2xs font-semibold", equipped.equippedArmor ? "text-crimson" : "italic font-normal text-ink-light")}>
            {equipped.equippedArmor?.name ?? "Vacío"}
          </span>
        </EquipTag>
        <EquipTag position="bl" label="M. secundaria">
          <span className={cn("block text-2xs font-semibold", equipped.isTwoHanded || !equipped.offHandItem ? "italic font-normal text-ink-light" : "text-crimson")}>
            {equipped.isTwoHanded ? "Ocupada (2 manos)" : equipped.offHandItem?.name ?? "Vacío"}
          </span>
        </EquipTag>
        <EquipTag position="br" label="M. principal">
          <span className={cn("block text-2xs font-semibold", equipped.mainHand ? "text-crimson" : "italic font-normal text-ink-light")}>
            {equipped.mainHand?.name ?? "Vacío"}
          </span>
        </EquipTag>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <StatBar label="PV" value={character.currentHp} max={stats.hp.value} color="moss" markerAt={stats.crisis.value} />
          <AmountAdjuster onApply={onAdjustHp} />
        </div>
        {inCrisis && <p className="font-label text-2xs uppercase tracking-wide text-crimson font-bold">● Crisis</p>}
        <div className="flex items-center gap-2">
          <StatBar label="PM" value={character.currentMp} max={stats.mp.value} color="blue" />
          <AmountAdjuster onApply={onAdjustMp} />
        </div>
        <div className="flex items-center gap-2">
          <StatBar label="XP" value={character.xp} max={XP_PER_LEVEL} color="brass" />
          <StepAdjuster onChange={onAdjustXp} />
          <button type="button" onClick={() => setXpModalOpen(true)} aria-label="Cómo funciona el XP" className="flex size-4 shrink-0 items-center justify-center rounded-full border border-brass/60 text-[9px] text-ink-light hover:border-brass hover:text-brass">i</button>
        </div>
        {canLevelUp && (
          <div className="mt-1 flex flex-col gap-1.5">
            <p className="font-label text-2xs uppercase tracking-wide text-brass-bright">¡Podés subir de nivel!</p>
            <LevelUpControl character={character} onLevelUp={onLevelUp} />
          </div>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <CombatBadge label="Iniciativa" value={stats.initiative.value >= 0 ? `+${stats.initiative.value}` : stats.initiative.value} shape="hex" />
        <CombatBadge label="Defensa" value={stats.defense.value} shape="shield" />
        <CombatBadge label="Def. Mágica" value={stats.magicDefense.value} shape="shield" />
      </div>

      <div className="flex items-center justify-between gap-2 rounded-md border border-brass bg-parchment px-2.5 py-2">
        <span className="flex items-center gap-1 font-label text-2xs text-ink-light">
          Puntos de Fábula
          <button type="button" onClick={() => setFpModalOpen(true)} aria-label="Cómo funcionan los Puntos de Fábula" className="flex size-4 items-center justify-center rounded-full border border-brass/60 text-[9px] text-ink-light hover:border-brass hover:text-brass">i</button>
        </span>
        <span className="font-display text-xl text-crimson">{character.fabulaPoints}</span>
        <AmountAdjuster onApply={adjustFp} />
      </div>

      <div className="flex gap-1.5">
        <button type="button" onClick={() => onOpenModal("opportunities")} className="flex flex-1 flex-col items-center gap-1 rounded-md border border-brass px-1 py-2 font-label text-[10px] uppercase tracking-wide text-ink-light transition-colors hover:bg-parchment-deep/30">
          <Zap size={16} className="text-crimson" /> Oport.
        </button>
        <button type="button" onClick={() => onOpenModal("services")} className="flex flex-1 flex-col items-center gap-1 rounded-md border border-brass px-1 py-2 font-label text-[10px] uppercase tracking-wide text-ink-light transition-colors hover:bg-parchment-deep/30">
          <Building2 size={16} className="text-crimson" /> Pueblo
        </button>
      </div>

      <Modal open={fpModalOpen} onClose={() => setFpModalOpen(false)} title="Puntos de Fábula">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-label text-2xs font-bold uppercase tracking-wide text-ink mb-1">Cómo conseguirlos</p>
            <ul className="space-y-1 text-xs text-ink-light font-body">{fabulaPointGains.map((g, i) => <li key={i}>· {g}</li>)}</ul>
          </div>
          <div>
            <p className="font-label text-2xs font-bold uppercase tracking-wide text-ink mb-1">Para qué usarlos</p>
            <ul className="space-y-1 text-xs text-ink-light font-body">{fabulaPointUses.map((u, i) => <li key={i}>· {u}</li>)}</ul>
          </div>
        </div>
      </Modal>

      <Modal open={xpModalOpen} onClose={() => setXpModalOpen(false)} title="Puntos de experiencia">
        <p className="text-sm leading-relaxed text-ink-light font-body">{xpNote}</p>
      </Modal>
    </aside>
  );
}

// ─── header ─────────────────────────────────────────────────────────────────

interface SheetHeaderProps {
  character: FUCharacter;
  portraitUrl: string | null;
  uploadingImage: boolean;
  onUploadPortrait: (file: File) => void;
  onOpenModal: (modal: "opportunities" | "services") => void;
}

function SheetHeader({ character, portraitUrl, uploadingImage, onUploadPortrait, onOpenModal }: SheetHeaderProps) {
  const ref = useReferenceDataContext();
  return (
    <header className="flex flex-wrap items-center gap-4 rounded-t-md border-b-[3px] border-brass bg-gradient-to-b from-leather to-[#241b12] px-4 py-3.5 md:px-6">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-full border-2 border-brass-light bg-parchment-dark/30">
        {portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
          <img src={portraitUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center"><User size={26} className="text-leather-lighter" /></div>
        )}
        <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-ink/0 text-center font-label text-[9px] uppercase text-transparent transition-colors hover:bg-ink/60 hover:text-parchment">
          {uploadingImage ? "…" : "Cambiar"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadPortrait(e.target.files[0])} />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-display text-2xl tracking-wide text-parchment">{character.name || "Héroe sin nombre"}</h1>
          <span className="rounded-full border border-brass-light bg-crimson px-2.5 py-0.5 font-label text-xs font-semibold text-crimson-foreground">Nv. {character.level}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {character.classLevels.length === 0 ? (
            <span className="font-label text-xs text-parchment-dark">Sin clase</span>
          ) : (
            character.classLevels.map((cl) => (
              <span key={cl.classId} className="rounded-md border border-brass bg-parchment/10 px-2 py-0.5 font-label text-2xs font-medium tracking-wide text-brass-light">
                {ref.classesById[cl.classId]?.name ?? "?"} Nv. {cl.levels}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="ml-2 hidden flex-1 gap-2.5 lg:flex">
        <div className="min-w-0 flex-1 rounded-md border border-brass bg-black/20 px-3 py-1.5">
          <div className="font-label text-[10px] text-brass-light">Identidad</div>
          <div className="truncate font-body text-sm text-parchment">{character.identity || "—"}</div>
        </div>
        <div className="min-w-0 flex-1 rounded-md border border-brass bg-black/20 px-3 py-1.5">
          <div className="font-label text-[10px] text-brass-light">Tema</div>
          <div className="truncate font-body text-sm text-parchment">{character.theme || "—"}</div>
        </div>
        <div className="min-w-0 flex-1 rounded-md border border-brass bg-black/20 px-3 py-1.5">
          <div className="font-label text-[10px] text-brass-light">Origen</div>
          <div className="truncate font-body text-sm text-parchment">{character.origin || "—"}</div>
        </div>
      </div>

      <div className="ml-auto flex shrink-0 gap-2">
        <button type="button" onClick={() => onOpenModal("opportunities")} className="flex items-center gap-1.5 rounded-md border border-brass px-2.5 py-2 font-label text-xs text-brass-light transition-colors hover:bg-parchment/10">
          <Zap size={14} /> <span className="hidden sm:inline">Oportunidades</span>
        </button>
        <button type="button" onClick={() => onOpenModal("services")} className="flex items-center gap-1.5 rounded-md border border-brass px-2.5 py-2 font-label text-xs text-brass-light transition-colors hover:bg-parchment/10">
          <Building2 size={14} /> <span className="hidden sm:inline">Servicios</span>
        </button>
      </div>
    </header>
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

const TABS = [
  { key: "combat", label: "Combate" },
  { key: "inventory", label: "Inventario" },
  { key: "bonds", label: "Vínculos" },
  { key: "character", label: "Personaje" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

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
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [tab, setTab] = React.useState<TabKey>("combat");
  const [modal, setModal] = React.useState<null | "opportunities" | "services">(null);

  const mainHandId = character.equipment.weapons[0];
  const mainHand = mainHandId ? findEquipmentItem(mainHandId, ref) : undefined;
  const isTwoHanded = Boolean(mainHand && "handedness" in mainHand && mainHand.handedness === "two-handed");
  const offHandWeaponId = character.equipment.weapons[1];
  const offHandWeapon = offHandWeaponId ? findEquipmentItem(offHandWeaponId, ref) : undefined;
  const equippedShield = character.equipment.shield ? findEquipmentItem(character.equipment.shield, ref) : undefined;
  const offHandItem = offHandWeapon ?? equippedShield;
  const equippedArmor = character.equipment.armor ? findEquipmentItem(character.equipment.armor, ref) : undefined;
  const equipped: EquippedRefs = { mainHand, offHandItem, offHandWeapon, equippedShield, equippedArmor, isTwoHanded };

  async function uploadImage(file: File, kind: "portrait" | "full_body") {
    setUploadingImage(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/rol/media", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) return;
      if (kind === "portrait") onImagesChange(json.data.url, fullBodyUrl);
      else onImagesChange(portraitUrl, json.data.url);
    } finally {
      setUploadingImage(false);
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
        <div className="flex items-center justify-between gap-3 mb-2">
          <Link href={backHref} className="font-label text-2xs uppercase tracking-widest text-parchment-dark hover:text-parchment">
            ← Mis personajes
          </Link>
          <Link href={`/rol/characters/${character.id}/edit`} className="font-label text-2xs uppercase tracking-widest text-parchment-dark hover:text-parchment">
            Editar personaje ✎
          </Link>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border shadow-parchment-lg">
        <SheetHeader
          character={character}
          portraitUrl={portraitUrl}
          uploadingImage={uploadingImage}
          onUploadPortrait={(file) => uploadImage(file, "portrait")}
          onOpenModal={setModal}
        />

        <div className="grid gap-4 bg-gradient-to-br from-parchment to-parchment-dark p-3 md:grid-cols-[250px_1fr] md:p-5 md:items-start">
          <VitalsRail
            character={character}
            stats={stats}
            inCrisis={inCrisis}
            canLevelUp={canLevelUp}
            fullBodyUrl={fullBodyUrl}
            uploadingImage={uploadingImage}
            onUploadFullBody={(file) => uploadImage(file, "full_body")}
            equipped={equipped}
            onUpdate={onUpdate}
            onLevelUp={levelUp}
            onAdjustHp={adjustHp}
            onAdjustMp={adjustMp}
            onAdjustXp={adjustXp}
            onOpenModal={setModal}
          />

          <main className="min-w-0">
            <nav className="mb-4 flex gap-1 border-b-2 border-brass">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "-mb-0.5 border-b-[3px] px-4 py-2.5 font-label text-sm font-medium transition-colors",
                    tab === t.key ? "border-crimson text-crimson" : "border-transparent text-ink-light hover:text-ink"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {tab === "combat" && (
              <div className="flex flex-col gap-5">
                <AttributesSection character={character} current={current} onUpdate={onUpdate} />

                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 border-b border-brass/40 pb-1.5 font-label text-xs uppercase tracking-wide text-ink-light">
                    <Sword size={14} className="text-crimson" /> Acciones de combate
                  </h3>
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                    <ActionGrid />
                    <div className="lg:w-64"><WeaponCards character={character} current={current} /></div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 border-b border-brass/40 pb-1.5 font-label text-xs uppercase tracking-wide text-ink-light">
                    Habilidades y hechizos
                  </h3>
                  <ActiveAbilitiesTable character={character} current={current} onUpdate={onUpdate} />
                </div>
              </div>
            )}

            {tab === "inventory" && <InventoryTab character={character} onUpdate={onUpdate} equipped={equipped} />}
            {tab === "bonds" && <BondsTab character={character} onUpdate={onUpdate} />}
            {tab === "character" && <PersonajeTab character={character} onUpdate={onUpdate} guildStanding={guildStanding} />}

            <p className="mt-6 flex items-start gap-1 border-t border-border/60 pt-2 text-2xs text-ink-light font-body">
              <Info size={12} className="shrink-0 mt-px" />
              {glossary.map((g, i) => (
                <React.Fragment key={g.term}>
                  {i > 0 && " · "}
                  <strong className="text-ink">{g.term}:</strong> {g.definition}
                </React.Fragment>
              ))}
            </p>
          </main>
        </div>
      </div>

      <Modal open={modal === "opportunities"} onClose={() => setModal(null)} title="Oportunidades" className="max-w-2xl">
        <p className="mb-3 text-xs text-ink-light font-body">{criticalFumbleNote}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.term} className="border-b border-border/60 last:border-b-0">
                  <td className="whitespace-nowrap px-2 py-1.5 align-top font-body text-sm font-semibold text-crimson">{o.term}</td>
                  <td className="px-2 py-1.5 font-body text-sm text-ink">{o.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal open={modal === "services"} onClose={() => setModal(null)} title="Servicios del pueblo">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-brass px-2 py-1.5 text-left font-label text-2xs uppercase tracking-wide text-ink-light">Servicio</th>
                <th className="border-b border-brass px-2 py-1.5 text-left font-label text-2xs uppercase tracking-wide text-ink-light">Costo</th>
              </tr>
            </thead>
            <tbody>
              {villageServices.map((s) => (
                <tr key={s.service} className="border-b border-border/60 last:border-b-0">
                  <td className="px-2 py-1.5 font-body text-sm font-semibold text-crimson">{s.service}</td>
                  <td className="px-2 py-1.5 font-body text-sm text-ink">{s.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-light font-body">{villageServicesNote}</p>
      </Modal>
    </div>
  );
}
