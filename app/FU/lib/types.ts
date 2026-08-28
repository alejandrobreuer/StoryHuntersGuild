/**
 * Character / draft shapes — what a *player* has chosen, as opposed to
 * app/FU/data/types.ts which describes the reference rules content itself.
 */
import type { DieSize } from "../data/types";
import type { BondEmotionId } from "../data/bonds";
import type { AffinityStatus } from "../data/affinities";

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
  /**
   * Freeform description of the equipped Accessory (rare tier, GM-designed —
   * there's no fixed catalog to pick from, unlike weapons/armor/shields).
   */
  accessory: string;
}

export interface FUBond {
  /** Who or what the Bond is with — a person, nation, organization, etc. */
  name: string;
  /** 0-3 emotions, at most one per pairing (see data/bonds.ts). Strength = length. */
  emotions: BondEmotionId[];
}

export interface FUCharacter {
  id: string;
  createdAt: string;
  updatedAt: string;

  level: number; // 5 at creation, grows via XP — see xp below

  identity: string;
  theme: string;
  origin: string;
  /** Personal Trait (freeform) — distinct from a Bond's traits. */
  trait: string;
  /** Freeform quirks/flavor, separate from Trait. */
  quirks: string;

  classLevels: FUCharacterClassLevel[];
  attributes: FUCharacterAttributes;
  /** Active status effect ids (see data/statusEffects.ts) — empty when healthy. */
  statusEffects: string[];
  /** Heroic Skill ids taken (see data/referenceDataType.ts) — one is earned per mastered class (level 10). */
  heroicSkills: string[];
  /**
   * Bonds emerge through play rather than at creation (per the rulebook),
   * so unlike everything else here this starts empty and is only ever
   * grown from the character sheet, never the wizard.
   */
  bonds: FUBond[];

  equipment: FUCharacterEquipment;
  /** Owned but not equipped — item ids from data/equipment.ts. */
  backpack: string[];
  /** Freeform quest-item journal — for things a GM tells a player to note down that aren't in the equipment catalog. */
  otherItemsNote: string;
  zenit: number;

  name: string;
  pronouns: string;
  appearance: string;

  fabulaPoints: number;

  /** Current HP/MP/IP — max is always derived (see lib/derivedStats.ts), only the "remaining" values are stored. */
  currentHp: number;
  currentMp: number;
  currentIp: number;

  /** Accumulated XP not yet spent on a level-up (see lib/derivedStats.ts's XP_PER_LEVEL). */
  xp: number;

  /** Per-element affinity — an element missing from this map defaults to "normal". */
  elementalAffinities: Partial<Record<string, AffinityStatus>>;
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
    equipment: { weapons: [], accessory: "" },
    savingsRoll: null,
    name: "",
    pronouns: "",
    appearance: "",
    templateId: null,
  };
}
