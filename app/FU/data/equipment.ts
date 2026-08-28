/**
 * Basic weapons, armor and shields — transcribed verbatim from
 * Reference/reference-data/weapons.txt and armor-shields.txt.
 * "E" suffix in the source denotes a martial item (requires a class grant
 * to equip); the letter itself is stripped from `name` and captured in
 * `martial`.
 *
 * Source data for scripts/seed-fu-reference-data.ts only — the running app
 * reads equipment from the DB (shg_fu_weapon / shg_fu_armor_shield, see
 * app/FU/data/loadReferenceData.ts) via useReferenceDataContext(), not from
 * this file. Kept as the human-editable source of truth — see classes.ts's
 * doc comment for the edit → regenerate → run-migration workflow.
 */
import type { FUArmor, FUShield, FUWeapon } from "./types";

export const weapons: FUWeapon[] = [
  // Arcane
  {
    id: "staff", name: "Staff", category: "Arcane", cost: 100, martial: false,
    handedness: "two-handed", range: "melee",
    accuracy: "【WLP + WLP】", damage: "【HR + 6】physical", notes: "No Quality.",
  },
  {
    id: "tome", name: "Tome", category: "Arcane", cost: 100, martial: false,
    handedness: "two-handed", range: "melee",
    accuracy: "【INS + INS】", damage: "【HR + 6】physical", notes: "No Quality.",
  },
  // Bow
  {
    id: "crossbow", name: "Crossbow", category: "Bow", cost: 150, martial: false,
    handedness: "two-handed", range: "ranged",
    accuracy: "【DEX + INS】", damage: "【HR + 8】physical", notes: "No Quality.",
  },
  {
    id: "shortbow", name: "Shortbow", category: "Bow", cost: 200, martial: false,
    handedness: "two-handed", range: "ranged",
    accuracy: "【DEX + DEX】", damage: "【HR + 8】physical", notes: "No Quality.",
  },
  // Brawling
  {
    id: "unarmed-strike", name: "Unarmed Strike", category: "Brawling", cost: null, martial: false,
    handedness: "one-handed", range: "melee",
    accuracy: "【DEX + MIG】", damage: "【HR + 0】physical",
    notes: "Automatically equipped in each empty hand slot.",
  },
  {
    id: "improvised-melee", name: "Improvised (Melee)", category: "Brawling", cost: null, martial: false,
    handedness: "one-handed", range: "melee",
    accuracy: "【DEX + MIG】", damage: "【HR + 2】physical", notes: "Breaks after the attack.",
  },
  {
    id: "iron-knuckle", name: "Iron Knuckle", category: "Brawling", cost: 150, martial: false,
    handedness: "one-handed", range: "melee",
    accuracy: "【DEX + MIG】", damage: "【HR + 6】physical", notes: "No Quality.",
  },
  // Dagger
  {
    id: "steel-dagger", name: "Steel Dagger", category: "Dagger", cost: 150, martial: false,
    handedness: "one-handed", range: "melee",
    accuracy: "【DEX + INS】+1", damage: "【HR + 4】physical", notes: "No Quality.",
  },
  // Firearm
  {
    id: "pistol", name: "Pistol", category: "Firearm", cost: 250, martial: true,
    handedness: "one-handed", range: "ranged",
    accuracy: "【DEX + INS】", damage: "【HR + 8】physical", notes: "No Quality.",
  },
  // Flail
  {
    id: "chain-whip", name: "Chain Whip", category: "Flail", cost: 150, martial: false,
    handedness: "two-handed", range: "melee",
    accuracy: "【DEX + DEX】", damage: "【HR + 8】physical", notes: "No Quality.",
  },
  // Heavy
  {
    id: "iron-hammer", name: "Iron Hammer", category: "Heavy", cost: 200, martial: false,
    handedness: "one-handed", range: "melee",
    accuracy: "【MIG + MIG】", damage: "【HR + 6】physical", notes: "No Quality.",
  },
  {
    id: "broadaxe", name: "Broadaxe", category: "Heavy", cost: 250, martial: true,
    handedness: "one-handed", range: "melee",
    accuracy: "【MIG + MIG】", damage: "【HR + 10】physical", notes: "No Quality.",
  },
  {
    id: "waraxe", name: "Waraxe", category: "Heavy", cost: 250, martial: true,
    handedness: "two-handed", range: "melee",
    accuracy: "【MIG + MIG】", damage: "【HR + 14】physical", notes: "No Quality.",
  },
  // Spear
  {
    id: "light-spear", name: "Light Spear", category: "Spear", cost: 200, martial: true,
    handedness: "one-handed", range: "melee",
    accuracy: "【DEX + MIG】", damage: "【HR + 8】physical", notes: "No Quality.",
  },
  {
    id: "heavy-spear", name: "Heavy Spear", category: "Spear", cost: 200, martial: true,
    handedness: "two-handed", range: "melee",
    accuracy: "【DEX + MIG】", damage: "【HR + 12】physical", notes: "No Quality.",
  },
  // Sword
  {
    id: "bronze-sword", name: "Bronze Sword", category: "Sword", cost: 200, martial: true,
    handedness: "one-handed", range: "melee",
    accuracy: "【DEX + MIG】+1", damage: "【HR + 6】physical", notes: "No Quality.",
  },
  {
    id: "greatsword", name: "Greatsword", category: "Sword", cost: 200, martial: true,
    handedness: "two-handed", range: "melee",
    accuracy: "【DEX + MIG】+1", damage: "【HR + 10】physical", notes: "No Quality.",
  },
  {
    id: "katana", name: "Katana", category: "Sword", cost: 200, martial: true,
    handedness: "two-handed", range: "melee",
    accuracy: "【DEX + INS】+1", damage: "【HR + 10】physical", notes: "No Quality.",
  },
  {
    id: "rapier", name: "Rapier", category: "Sword", cost: 200, martial: true,
    handedness: "one-handed", range: "melee",
    accuracy: "【DEX + INS】+1", damage: "【HR + 6】physical", notes: "No Quality.",
  },
  // Thrown
  {
    id: "improvised-ranged", name: "Improvised (Ranged)", category: "Thrown", cost: null, martial: false,
    handedness: "one-handed", range: "ranged",
    accuracy: "【DEX + MIG】", damage: "【HR + 2】physical", notes: "Breaks after the attack.",
  },
  {
    id: "shuriken", name: "Shuriken", category: "Thrown", cost: 150, martial: false,
    handedness: "one-handed", range: "ranged",
    accuracy: "【DEX + INS】", damage: "【HR + 4】physical", notes: "No Quality.",
  },
];

export const armors: FUArmor[] = [
  {
    id: "no-armor", name: "No Armor", cost: 0, martial: false,
    defense: { dexPlus: 0 }, magicDefense: { insPlus: 0 }, initiative: 0, notes: "No Quality.",
  },
  {
    id: "silk-shirt", name: "Silk Shirt", cost: 100, martial: false,
    defense: { dexPlus: 0 }, magicDefense: { insPlus: 2 }, initiative: -1, notes: "No Quality.",
  },
  {
    id: "travel-garb", name: "Travel Garb", cost: 100, martial: false,
    defense: { dexPlus: 1 }, magicDefense: { insPlus: 1 }, initiative: -1, notes: "No Quality.",
  },
  {
    id: "combat-tunic", name: "Combat Tunic", cost: 150, martial: false,
    defense: { dexPlus: 1 }, magicDefense: { insPlus: 1 }, initiative: 0, notes: "No Quality.",
  },
  {
    id: "sage-robe", name: "Sage Robe", cost: 200, martial: false,
    defense: { dexPlus: 1 }, magicDefense: { insPlus: 2 }, initiative: -2, notes: "No Quality.",
  },
  {
    id: "brigandine", name: "Brigandine", cost: 150, martial: true,
    defense: { fixed: 10 }, magicDefense: { insPlus: 0 }, initiative: -2, notes: "No Quality.",
  },
  {
    id: "bronze-plate", name: "Bronze Plate", cost: 200, martial: true,
    defense: { fixed: 11 }, magicDefense: { insPlus: 0 }, initiative: -3, notes: "No Quality.",
  },
  {
    id: "runic-plate", name: "Runic Plate", cost: 250, martial: true,
    defense: { fixed: 11 }, magicDefense: { insPlus: 1 }, initiative: -3, notes: "No Quality.",
  },
  {
    id: "steel-plate", name: "Steel Plate", cost: 300, martial: true,
    defense: { fixed: 12 }, magicDefense: { insPlus: 0 }, initiative: -4, notes: "No Quality.",
  },
];

export const shields: FUShield[] = [
  {
    id: "bronze-shield", name: "Bronze Shield", cost: 100, martial: false,
    defenseBonus: 2, magicDefenseBonus: 0, initiative: 0, notes: "No Quality.",
  },
  {
    id: "runic-shield", name: "Runic Shield", cost: 150, martial: true,
    defenseBonus: 2, magicDefenseBonus: 2, initiative: 0, notes: "No Quality.",
  },
];
