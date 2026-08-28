/**
 * Static rulebook reference content — transcribed from Fabula_Ultima_Guide.pdf
 * so the sheet is usable without the rulebook open next to it.
 */

// "ACTIONS" (p.66-74) — one action per turn during a conflict, condensed.
export interface FUActionRef {
  name: string;
  description: string;
}

export const actions: FUActionRef[] = [
  {
    name: "Attack",
    description:
      "Perform a melee or ranged attack with an equipped weapon: an Accuracy Check against the " +
      "target's Defense. On a hit, deal damage equal to the weapon's High Roll + its fixed value.",
  },
  {
    name: "Equipment",
    description:
      "Swap any number of equipped items with items in your backpack. Doesn't apply to armor.",
  },
  {
    name: "Guard",
    description:
      "Until the start of your next turn: gain Resistance to all damage types, and a +2 bonus to " +
      "Opposed Checks. You may also cover another creature, protecting them from melee attacks.",
  },
  {
    name: "Hinder",
    description:
      "Perform a Check (DL 10) against an opponent. On a success, inflict dazed, shaken, slow, or " +
      "weak on them — your choice.",
  },
  {
    name: "Inventory",
    description: "Spend Inventory Points to produce and immediately use a consumable item.",
  },
  {
    name: "Objective",
    description:
      "Work towards a goal within the scene via an Attribute or Opposed Check — often advancing a " +
      "Clock toward a minor, major, or resolutive outcome.",
  },
  {
    name: "Spell",
    description: "Cast one of the spells you've learned.",
  },
  {
    name: "Study",
    description:
      "Learn more about a person, creature, item, or location with an Open Check (usually " +
      "INS + INS). Higher Results reveal more detailed information.",
  },
  {
    name: "Skill",
    description: "Some Skills require you to spend an action to activate them.",
  },
  {
    name: "Other",
    description:
      "Attempt something not covered above — describe it and negotiate its resolution with the " +
      "Game Master.",
  },
];

// "FABULA POINTS" (p.96) — gaining and spending.
export const fabulaPointGains: string[] = [
  "If you have no Fabula Points at the start of a session, you immediately receive 1.",
  "Whenever you roll a fumble on a Check, you immediately receive 1.",
  "Whenever a Villain makes an entrance during a scene, every Player Character receives 1.",
  "If you're reduced to 0 Hit Points and choose to Surrender, you immediately receive 2.",
  "(Optional rule) Invoking a Bond or Trait to automatically fail a Check earns you 1.",
];

export const fabulaPointUses: string[] = [
  "Alter the story — add Bond strength to a Check, or alter an existing element / add a new one.",
  "Invoke a Trait or Bond to reroll one or both dice on a Check just performed.",
  "Some powerful Skills require spending Fabula Points to activate.",
];

export const fabulaPointsNote =
  "Each character starts with 3 Fabula Points. There's no upper limit, but spending them (not " +
  "hoarding) is one of the main ways your group earns Experience Points and levels up.";

// "INVENTORY POINTS" (p.28) — the canonical 5-item catalog now lives in the
// DB (shg_fu_inventory_item, see app/FU/data/loadReferenceData.ts); this
// type stays here since both the loader and its consumers need it.
export interface FUIpItem {
  /** Slug id (e.g. "remedy") — stable even if the display name is translated. */
  id: string;
  name: string;
  ipCost: number;
  effect: string;
}

// "GLOSSARY" — new-player-facing terms referenced constantly elsewhere on
// the sheet but never defined there (per character-sheet-logic-spec.md).
export const glossary: { term: string; definition: string }[] = [
  { term: "HR (High Roll)", definition: "En una Verificación tirás dos dados y sumás sus resultados — el HR es el más alto de los dos por sí solo, usado en muchas fórmulas de daño y efectos." },
  { term: "Crisis", definition: "Cuando tus Puntos de Vida caen a la mitad de tu máximo (redondeado hacia abajo) o menos, entrás en Crisis — algunos efectos y habilidades cambian su comportamiento mientras estás así." },
];
