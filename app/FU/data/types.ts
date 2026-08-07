/**
 * Content-model types for Fabula Ultima rules data parsed from
 * Reference/reference-data/**. These describe the *reference* data
 * (classes, equipment, tables) — not a player's character. See
 * app/FU/lib/types.ts for the character/draft shapes.
 */

export type StatKey = "hp" | "mp" | "ip" | "defense" | "magicDefense" | "initiative";

export type DieSize = 6 | 8 | 10 | 12;

export interface FUClassBenefit {
  /** Full rules text, verbatim from the source. */
  text: string;
  statBonus?: { stat: StatKey; amount: number };
  equipGrant?: { weapons?: "melee" | "ranged"; armor?: boolean; shields?: boolean };
}

export interface FUSkill {
  name: string;
  /** 1 if not repeatable, else the (◇N) max. */
  maxLevel: number;
  /** Full rules text. 【SL】is left as a literal token, substituted at render time. */
  text: string;
}

export interface FUClass {
  id: string;
  name: string;
  alsoKnownAs: string[];
  description: string;
  roleplayQuestions: string[];
  freeBenefits: FUClassBenefit[];
  /** Exactly 5 per class. */
  skills: FUSkill[];
  subsystem?: FUSubsystem;
}

export interface FUArcanum {
  name: string;
  domains: string[];
  mergeText: string;
  dismissText: string;
}

export interface FUSpell {
  name: string;
  /** Spells marked with 「r」 require a Magic Check. */
  offensive: boolean;
  mpCost: string;
  target: string;
  duration: string;
  text: string;
  opportunity?: string;
}

export interface FUInventionTier {
  tier: "basic" | "advanced" | "superior";
  name?: string;
  ipCost?: number;
  text: string;
  table?: { headers: string[]; rows: string[][] };
}

export interface FUInventionType {
  id: string;
  name: string;
  alsoKnownAs: string[];
  description: string;
  tiers: FUInventionTier[];
}

export type FUSubsystem =
  | { type: "arcana"; entries: FUArcanum[] }
  | { type: "spells"; entries: FUSpell[] }
  | { type: "inventions"; entries: FUInventionType[] };

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export interface FUWeapon {
  id: string;
  name: string;
  category: string;
  /** null for "Unarmed Strike"/"Improvised" — no purchase cost. */
  cost: number | null;
  martial: boolean;
  handedness: "one-handed" | "two-handed";
  range: "melee" | "ranged";
  /** e.g. "【DEX + INS】+1" */
  accuracy: string;
  /** e.g. "【HR + 6】physical" */
  damage: string;
  notes: string;
}

export interface FUArmor {
  id: string;
  name: string;
  cost: number;
  martial: boolean;
  defense: { fixed: number } | { dexPlus: number };
  magicDefense: { fixed: number } | { insPlus: number };
  initiative: number;
  notes: string;
}

export interface FUShield {
  id: string;
  name: string;
  cost: number;
  martial: boolean;
  defenseBonus: number;
  magicDefenseBonus: number;
  initiative: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Creation tables
// ---------------------------------------------------------------------------

export interface FUIdentityTables {
  coreConcept: string[];
  adjectives: string[];
  details: string[];
}

export interface FUTheme {
  name: string;
  description: string;
}

export interface FUClassicCharacter {
  id: string;
  name: string;
  attributes: { dexterity: DieSize; insight: DieSize; might: DieSize; willpower: DieSize };
  classLevels: { classId: string; levels: number; skillsSummary: string }[];
  equipmentSummary: string;
  startingZenit: number;
}
