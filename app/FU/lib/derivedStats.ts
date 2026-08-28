/**
 * Formulas from Reference/reference-data/creation-process.txt, "CALCULATE
 * YOUR HIT POINTS AND MIND POINTS" / "...INVENTORY POINTS" /
 * "...DEFENSE, MAGIC DEFENSE AND INITIATIVE".
 *
 * Every calculator returns both the final number and a breakdown so the UI
 * can show *why* the number is what it is (wizard step 6, character sheet).
 *
 * Reference data (classes/equipment/status effects) is DB-backed — see
 * app/FU/data/loadReferenceData.ts (server) / useReferenceData.ts (client)
 * — so every calculator that needs it takes a `ref: FUReferenceData` (or a
 * `Pick` of it) parameter instead of importing a static module.
 */
import type { FUClass, StatKey } from "../data/types";
import { stepDownDie, type AttributeKey } from "../data/statusEffects";
import type { FUReferenceData } from "../data/referenceDataType";
import type { FUCharacter, FUCharacterAttributes, FUCharacterEquipment } from "./types";

export interface StatTerm {
  label: string;
  value: number;
}

export interface StatResult {
  value: number;
  breakdown: StatTerm[];
}

function classBonusTerms(classes: FUClass[], stat: StatKey): StatTerm[] {
  const terms: StatTerm[] = [];
  for (const cls of classes) {
    for (const benefit of cls.freeBenefits) {
      if (benefit.statBonus?.stat === stat) {
        terms.push({ label: `${cls.name} free benefit`, value: benefit.statBonus.amount });
      }
    }
  }
  return terms;
}

function sum(terms: StatTerm[]): number {
  return terms.reduce((total, t) => total + t.value, 0);
}

export function calcHP(level: number, mightDie: number, classes: FUClass[]): StatResult {
  const breakdown: StatTerm[] = [
    { label: "Level", value: level },
    { label: "5 × Might die", value: 5 * mightDie },
    ...classBonusTerms(classes, "hp"),
  ];
  return { value: sum(breakdown), breakdown };
}

export function calcCrisis(hpMax: number): StatResult {
  const value = Math.floor(hpMax / 2);
  return { value, breakdown: [{ label: "Half of max HP (rounded down)", value }] };
}

export function calcMP(level: number, willpowerDie: number, classes: FUClass[]): StatResult {
  const breakdown: StatTerm[] = [
    { label: "Level", value: level },
    { label: "5 × Willpower die", value: 5 * willpowerDie },
    ...classBonusTerms(classes, "mp"),
  ];
  return { value: sum(breakdown), breakdown };
}

export function calcIP(classes: FUClass[]): StatResult {
  const breakdown: StatTerm[] = [
    { label: "Base", value: 6 },
    ...classBonusTerms(classes, "ip"),
  ];
  return { value: sum(breakdown), breakdown };
}

export function calcDefense(
  dexDie: number,
  equipment: FUCharacterEquipment,
  ref: Pick<FUReferenceData, "armors" | "shields">,
): StatResult {
  const armor = equipment.armor ? ref.armors.find((a) => a.id === equipment.armor) : undefined;
  const shield = equipment.shield ? ref.shields.find((s) => s.id === equipment.shield) : undefined;

  const breakdown: StatTerm[] = [];
  if (armor && "fixed" in armor.defense) {
    breakdown.push({ label: `${armor.name} (fixed value)`, value: armor.defense.fixed });
  } else {
    breakdown.push({ label: "Dexterity die", value: dexDie });
    const plus = armor && "dexPlus" in armor.defense ? armor.defense.dexPlus : 0;
    if (plus) breakdown.push({ label: `${armor!.name} bonus`, value: plus });
  }
  if (shield?.defenseBonus) breakdown.push({ label: `${shield.name} bonus`, value: shield.defenseBonus });

  return { value: sum(breakdown), breakdown };
}

export function calcMagicDefense(
  insDie: number,
  equipment: FUCharacterEquipment,
  ref: Pick<FUReferenceData, "armors" | "shields">,
): StatResult {
  const armor = equipment.armor ? ref.armors.find((a) => a.id === equipment.armor) : undefined;
  const shield = equipment.shield ? ref.shields.find((s) => s.id === equipment.shield) : undefined;

  const breakdown: StatTerm[] = [];
  if (armor && "fixed" in armor.magicDefense) {
    breakdown.push({ label: `${armor.name} (fixed value)`, value: armor.magicDefense.fixed });
  } else {
    breakdown.push({ label: "Insight die", value: insDie });
    const plus = armor && "insPlus" in armor.magicDefense ? armor.magicDefense.insPlus : 0;
    if (plus) breakdown.push({ label: `${armor!.name} bonus`, value: plus });
  }
  if (shield?.magicDefenseBonus) {
    breakdown.push({ label: `${shield.name} bonus`, value: shield.magicDefenseBonus });
  }

  return { value: sum(breakdown), breakdown };
}

export function calcInitiative(
  equipment: FUCharacterEquipment,
  ref: Pick<FUReferenceData, "armors">,
): StatResult {
  const armor = equipment.armor ? ref.armors.find((a) => a.id === equipment.armor) : undefined;
  const breakdown: StatTerm[] = [{ label: "Base", value: 0 }];
  if (armor?.initiative) breakdown.push({ label: `${armor.name} modifier`, value: armor.initiative });
  return { value: sum(breakdown), breakdown };
}

export interface DerivedStats {
  hp: StatResult;
  crisis: StatResult;
  mp: StatResult;
  ip: StatResult;
  defense: StatResult;
  magicDefense: StatResult;
  initiative: StatResult;
}

/**
 * Applies active status effects to base Attributes, per Fabula_Ultima_Guide
 * "STATUS EFFECTS" (p.94): effects hitting the same Attribute stack, but a
 * die can never drop below d6.
 */
export function currentAttributes(
  base: FUCharacterAttributes,
  activeStatusEffectIds: string[],
  statusEffects: FUReferenceData["statusEffects"],
): FUCharacterAttributes {
  const reductions: Record<AttributeKey, number> = { dexterity: 0, insight: 0, might: 0, willpower: 0 };
  for (const id of activeStatusEffectIds) {
    const effect = statusEffects.find((e) => e.id === id);
    if (!effect) continue;
    for (const attr of effect.affects) reductions[attr] += 1;
  }
  return {
    dexterity: stepDownDie(base.dexterity, reductions.dexterity),
    insight: stepDownDie(base.insight, reductions.insight),
    might: stepDownDie(base.might, reductions.might),
    willpower: stepDownDie(base.willpower, reductions.willpower),
  };
}

/**
 * HP/MP always use the character's BASE Might/Willpower die — the rulebook
 * is explicit that temporary Attribute changes never alter max HP/MP.
 * Defense/Magic Defense use the CURRENT (status-effect-adjusted) Dexterity/
 * Insight die, since they're "based on the current Attribute die size, not
 * your base Attribute die size" (creation-process.txt).
 */
export function calcDerivedStats(
  level: number,
  attributes: FUCharacterAttributes,
  equipment: FUCharacterEquipment,
  classes: FUClass[],
  activeStatusEffectIds: string[],
  ref: FUReferenceData,
): DerivedStats {
  const current = currentAttributes(attributes, activeStatusEffectIds, ref.statusEffects);
  const hp = calcHP(level, attributes.might, classes);
  const mp = calcMP(level, attributes.willpower, classes);
  return {
    hp,
    crisis: calcCrisis(hp.value),
    mp,
    ip: calcIP(classes),
    defense: calcDefense(current.dexterity, equipment, ref),
    magicDefense: calcMagicDefense(current.insight, equipment, ref),
    initiative: calcInitiative(equipment, ref),
  };
}

// ---------------------------------------------------------------------------
// Equipment budget (creation-process.txt, "PURCHASE STARTING EQUIPMENT" /
// "ROLL FOR INITIAL SAVINGS")
// ---------------------------------------------------------------------------

export function findEquipmentItem(id: string, ref: Pick<FUReferenceData, "weapons" | "armors" | "shields">) {
  return (
    ref.weapons.find((w) => w.id === id) ?? ref.armors.find((a) => a.id === id) ?? ref.shields.find((s) => s.id === id)
  );
}

/**
 * What's equipped is what's owned (see FUDraft.equipment doc comment) — so
 * the budget spent is just the sum of whatever's currently in the slots.
 */
export function calcSpent(equipment: FUCharacterEquipment, ref: Pick<FUReferenceData, "weapons" | "armors" | "shields">): number {
  const ids = [...equipment.weapons, equipment.shield, equipment.armor].filter(
    (id): id is string => Boolean(id),
  );
  return ids.reduce((total, id) => total + (findEquipmentItem(id, ref)?.cost ?? 0), 0);
}

export function rollSavings(): number {
  const d6 = () => 1 + Math.floor(Math.random() * 6);
  return (d6() + d6()) * 10;
}

// ---------------------------------------------------------------------------
// Experience & Leveling (Fabula_Ultima_Guide.pdf, "EXPERIENCE POINTS", p.36)
// ---------------------------------------------------------------------------

/** XP needed to gain a level — crossing this threshold spends 10 XP for +1 level. */
export const XP_PER_LEVEL = 10;
/** Every character gains this much automatically at the end of a session. */
export const SESSION_XP = 5;

/** How many class levels a character can invest in a single non-mastered class before it's "maxed" for this simplified model. */
export const MAX_CLASS_LEVEL = 10;
export const MAX_CLASSES = 3;

type LegacySheetFields = "trait" | "quirks" | "backpack" | "elementalAffinities" | "xp" | "currentHp" | "currentMp" | "currentIp" | "heroicSkills";

/**
 * shg_rol_character rows created before the cockpit-sheet rework have
 * sheet_data JSON missing every field added since (trait, quirks, backpack,
 * xp, elementalAffinities, current HP/MP/IP) — reading one straight off the
 * DB crashes the sheet (e.g. `character.backpack.map` on undefined). Fill in
 * sensible defaults on read instead of a one-off SQL backfill, since
 * sheet_data is deliberately a flexible JSONB blob validated at the app
 * layer, not rigid columns (see 019_shg_rol_init.sql). Current HP/MP/IP
 * default to full, not 0 — 0 would wrongly show a pre-existing character as
 * dead/in Crisis the first time their sheet loads under the new cockpit.
 */
export function normalizeCharacterSheet(
  raw: Omit<FUCharacter, LegacySheetFields> & Partial<Pick<FUCharacter, LegacySheetFields>>,
  classesById: FUReferenceData["classesById"],
): FUCharacter {
  const classes = (raw.classLevels ?? [])
    .map((cl) => classesById[cl.classId])
    .filter((c): c is FUClass => Boolean(c));

  return {
    ...raw,
    trait: raw.trait ?? "",
    quirks: raw.quirks ?? "",
    backpack: raw.backpack ?? [],
    elementalAffinities: raw.elementalAffinities ?? {},
    xp: raw.xp ?? 0,
    currentHp: raw.currentHp ?? calcHP(raw.level, raw.attributes.might, classes).value,
    currentMp: raw.currentMp ?? calcMP(raw.level, raw.attributes.willpower, classes).value,
    currentIp: raw.currentIp ?? calcIP(classes).value,
    heroicSkills: raw.heroicSkills ?? [],
    equipment: { ...raw.equipment, accessory: raw.equipment.accessory ?? "" },
  };
}

/** Which weapon/armor/shield categories a set of classes unlocks purchase of. */
export function equipCapabilities(classes: FUClass[]) {
  let melee = false;
  let ranged = false;
  let armor = false;
  let shield = false;
  for (const cls of classes) {
    for (const benefit of cls.freeBenefits) {
      if (!benefit.equipGrant) continue;
      if (benefit.equipGrant.weapons === "melee") melee = true;
      if (benefit.equipGrant.weapons === "ranged") ranged = true;
      if (benefit.equipGrant.armor) armor = true;
      if (benefit.equipGrant.shields) shield = true;
    }
  }
  return { melee, ranged, armor, shield };
}
