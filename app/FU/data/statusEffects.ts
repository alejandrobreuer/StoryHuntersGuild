/**
 * The six status effects — transcribed from Fabula_Ultima_Guide.pdf,
 * "STATUS EFFECTS" (p.94). Each temporarily reduces one or two Attribute
 * die sizes by one step; effects on the same Attribute stack, but a die
 * size can never drop below d6.
 */
import type { DieSize } from "./types";

export type AttributeKey = "dexterity" | "insight" | "might" | "willpower";

export interface FUStatusEffect {
  id: string;
  name: string;
  affects: AttributeKey[];
  description: string;
}

export const statusEffects: FUStatusEffect[] = [
  {
    id: "dazed",
    name: "Dazed",
    affects: ["insight"],
    description: "Temporarily reduces your Insight die size by one.",
  },
  {
    id: "enraged",
    name: "Enraged",
    affects: ["dexterity", "insight"],
    description: "Temporarily reduces your Dexterity and Insight die sizes by one.",
  },
  {
    id: "poisoned",
    name: "Poisoned",
    affects: ["might", "willpower"],
    description: "Temporarily reduces your Might and Willpower die sizes by one.",
  },
  {
    id: "shaken",
    name: "Shaken",
    affects: ["willpower"],
    description: "Temporarily reduces your Willpower die size by one.",
  },
  {
    id: "slow",
    name: "Slow",
    affects: ["dexterity"],
    description: "Temporarily reduces your Dexterity die size by one.",
  },
  {
    id: "weak",
    name: "Weak",
    affects: ["might"],
    description: "Temporarily reduces your Might die size by one.",
  },
];

export const statusEffectRulesNote =
  "Different status effects affecting the same Attribute stack (e.g. dazed + enraged both " +
  "reduce Insight, for a total reduction of two), but a die can never drop below d6. " +
  "Suffering a status effect again while already affected by it does nothing. Status effects " +
  "can be healed by resting, or via specific spells, Skills, or items.";

const DIE_STEPS: DieSize[] = [6, 8, 10, 12];

export function stepDownDie(die: DieSize, steps: number): DieSize {
  const index = DIE_STEPS.indexOf(die);
  const nextIndex = Math.max(0, index - steps);
  return DIE_STEPS[nextIndex];
}
