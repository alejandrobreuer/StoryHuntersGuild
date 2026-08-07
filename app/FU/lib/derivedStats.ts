/**
 * Formulas from Reference/reference-data/creation-process.txt, "CALCULATE
 * YOUR HIT POINTS AND MIND POINTS" / "...INVENTORY POINTS" /
 * "...DEFENSE, MAGIC DEFENSE AND INITIATIVE".
 *
 * Every calculator returns both the final number and a breakdown so the UI
 * can show *why* the number is what it is (wizard step 6, character sheet).
 */
import type { FUClass, StatKey } from "../data/types";
import { armors, shields, weapons } from "../data/equipment";
import { statusEffects, stepDownDie, type AttributeKey } from "../data/statusEffects";
import { CHARACTER_LEVEL } from "./types";
import type { FUCharacterAttributes, FUCharacterEquipment } from "./types";

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

export function calcHP(mightDie: number, classes: FUClass[]): StatResult {
  const breakdown: StatTerm[] = [
    { label: "Level", value: CHARACTER_LEVEL },
    { label: "5 × Might die", value: 5 * mightDie },
    ...classBonusTerms(classes, "hp"),
  ];
  return { value: sum(breakdown), breakdown };
}

export function calcCrisis(hpMax: number): StatResult {
  const value = Math.floor(hpMax / 2);
  return { value, breakdown: [{ label: "Half of max HP (rounded down)", value }] };
}

export function calcMP(willpowerDie: number, classes: FUClass[]): StatResult {
  const breakdown: StatTerm[] = [
    { label: "Level", value: CHARACTER_LEVEL },
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

export function calcDefense(dexDie: number, equipment: FUCharacterEquipment): StatResult {
  const armor = equipment.armor ? armors.find((a) => a.id === equipment.armor) : undefined;
  const shield = equipment.shield ? shields.find((s) => s.id === equipment.shield) : undefined;

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

export function calcMagicDefense(insDie: number, equipment: FUCharacterEquipment): StatResult {
  const armor = equipment.armor ? armors.find((a) => a.id === equipment.armor) : undefined;
  const shield = equipment.shield ? shields.find((s) => s.id === equipment.shield) : undefined;

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

export function calcInitiative(equipment: FUCharacterEquipment): StatResult {
  const armor = equipment.armor ? armors.find((a) => a.id === equipment.armor) : undefined;
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
  attributes: FUCharacterAttributes,
  equipment: FUCharacterEquipment,
  classes: FUClass[],
  activeStatusEffectIds: string[] = [],
): DerivedStats {
  const current = currentAttributes(attributes, activeStatusEffectIds);
  const hp = calcHP(attributes.might, classes);
  const mp = calcMP(attributes.willpower, classes);
  return {
    hp,
    crisis: calcCrisis(hp.value),
    mp,
    ip: calcIP(classes),
    defense: calcDefense(current.dexterity, equipment),
    magicDefense: calcMagicDefense(current.insight, equipment),
    initiative: calcInitiative(equipment),
  };
}

// ---------------------------------------------------------------------------
// Equipment budget (creation-process.txt, "PURCHASE STARTING EQUIPMENT" /
// "ROLL FOR INITIAL SAVINGS")
// ---------------------------------------------------------------------------

export function findEquipmentItem(id: string) {
  return (
    weapons.find((w) => w.id === id) ?? armors.find((a) => a.id === id) ?? shields.find((s) => s.id === id)
  );
}

/**
 * What's equipped is what's owned (see FUDraft.equipment doc comment) — so
 * the budget spent is just the sum of whatever's currently in the slots.
 */
export function calcSpent(equipment: FUCharacterEquipment): number {
  const ids = [...equipment.weapons, equipment.shield, equipment.armor].filter(
    (id): id is string => Boolean(id),
  );
  return ids.reduce((total, id) => total + (findEquipmentItem(id)?.cost ?? 0), 0);
}

export function rollSavings(): number {
  const d6 = () => 1 + Math.floor(Math.random() * 6);
  return (d6() + d6()) * 10;
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
