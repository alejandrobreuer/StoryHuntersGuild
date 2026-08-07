/**
 * Character / draft shapes — what a *player* has chosen, as opposed to
 * app/FU/data/types.ts which describes the reference rules content itself.
 */
import type { DieSize } from "../data/types";

export interface FUCharacterAttributes {
  dexterity: DieSize;
  insight: DieSize;
  might: DieSize;
  willpower: DieSize;
}

export type FUAttributePreset = "jack-of-all-trades" | "average" | "specialized" | "custom";

export interface FUCharacterClassLevel {
  classId: string;
  /** Levels invested in this class (1-5, across all classes summing to 5 at creation). */
  levels: number;
  /**
   * Which skill was taken for each level invested, in order. For repeatable
   * skills the same name can appear more than once (each entry = one more
   * Skill Level). Length should equal `levels`.
   */
  skillsTaken: string[];
}

export interface FUCharacterEquipment {
  /** Weapon ids currently equipped — 1 two-handed weapon, or up to 2 one-handed. */
  weapons: string[];
  shield?: string;
  armor?: string;
}

export interface FUCharacter {
  id: string;
  createdAt: string;
  updatedAt: string;

  level: number; // always 5 for v1

  identity: string;
  theme: string;
  origin: string;

  classLevels: FUCharacterClassLevel[];
  attributes: FUCharacterAttributes;

  equipment: FUCharacterEquipment;
  zenit: number;

  name: string;
  pronouns: string;
  appearance: string;

  fabulaPoints: number;
}

/**
 * The wizard's staging draft — a superset of FUCharacter with fields that
 * can be partially/invalidly filled while the user works through the 8
 * steps. Nothing here is a "real" character until Finish commits it.
 */
export interface FUDraft {
  identity: string;
  theme: string;
  origin: string;
  classLevels: FUCharacterClassLevel[];
  attributePreset: FUAttributePreset;
  attributes: FUCharacterAttributes;
  /**
   * What's equipped IS what's owned in this simplified model — the budget
   * bar sums cost directly from these slots, so there's no separate
   * "purchased but unequipped" list to keep in sync (and it lets buying two
   * of the same item, e.g. a pair of iron knuckles, just work naturally).
   */
  equipment: FUCharacterEquipment;
  savingsRoll: number | null; // 2d6×10 result once rolled
  name: string;
  pronouns: string;
  appearance: string;
  templateId: string | null; // classic character this draft was seeded from, if any
}

/**
 * Per creation-process.txt, a preset is a *multiset* of die sizes the
 * player distributes among the four attributes however they like — it is
 * not a fixed mapping (Camilla assigns "Average"'s d10/d8/d8/d6 as
 * Insight d10, Dexterity d8, Willpower d8, Might d6, for instance).
 */
export const ATTRIBUTE_PRESETS: Record<Exclude<FUAttributePreset, "custom">, DieSize[]> = {
  "jack-of-all-trades": [8, 8, 8, 8],
  average: [10, 8, 8, 6],
  specialized: [10, 10, 6, 6],
};

export const STARTING_BUDGET = 500;
export const STARTING_FABULA_POINTS = 3;
export const CHARACTER_LEVEL = 5;

export function emptyDraft(): FUDraft {
  return {
    identity: "",
    theme: "",
    origin: "",
    classLevels: [],
    attributePreset: "jack-of-all-trades",
    attributes: { dexterity: 8, insight: 8, might: 8, willpower: 8 },
    equipment: { weapons: [] },
    savingsRoll: null,
    name: "",
    pronouns: "",
    appearance: "",
    templateId: null,
  };
}
