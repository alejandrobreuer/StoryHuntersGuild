/**
 * Classic Characters — level-5 quick-start archetypes, transcribed from
 * classic-characters.txt. Offered as a "start from a template" shortcut
 * that pre-fills the wizard; skillsSummary is display text only (the
 * wizard still grants real skills as levels are dropped on each class in
 * the same distribution).
 */
import type { FUClassicCharacter } from "./types";

export const classicCharacters: FUClassicCharacter[] = [
  {
    id: "alchemist", name: "Alchemist",
    attributes: { dexterity: 8, insight: 10, might: 6, willpower: 8 },
    classLevels: [
      { classId: "tinkerer", levels: 3, skillsSummary: "Gadgets (Alchemy: Basic), Potion Rain, Secret Formula" },
      { classId: "wayfarer", levels: 2, skillsSummary: "Resourceful, Tavern Talk" },
    ],
    equipmentSummary: "Steel dagger, crossbow, travel garb, 170 zenit.",
    startingZenit: 170,
  },
  {
    id: "black-knight", name: "Black Knight",
    attributes: { dexterity: 8, insight: 6, might: 10, willpower: 8 },
    classLevels: [
      { classId: "darkblade", levels: 2, skillsSummary: "Shadow Strike (SL 2)" },
      { classId: "entropist", levels: 1, skillsSummary: "Entropic Magic (Drain Vigor)" },
      { classId: "weaponmaster", levels: 2, skillsSummary: "Bladestorm, Melee Weapon Mastery" },
    ],
    equipmentSummary: "Greatsword, runic plate, 120 zenit.",
    startingZenit: 120,
  },
  {
    id: "gambler", name: "Gambler",
    attributes: { dexterity: 10, insight: 8, might: 6, willpower: 8 },
    classLevels: [
      { classId: "entropist", levels: 2, skillsSummary: "Entropic Magic (Gamble), Lucky Seven" },
      { classId: "rogue", levels: 2, skillsSummary: "Dodge, High Speed" },
      { classId: "weaponmaster", levels: 1, skillsSummary: "Melee Weapon Mastery" },
    ],
    equipmentSummary: "Rapier, shuriken (reskinned as throwing cards!), silk shirt, 120 zenit.",
    startingZenit: 120,
  },
  {
    id: "gunslinger", name: "Gunslinger",
    attributes: { dexterity: 10, insight: 8, might: 8, willpower: 6 },
    classLevels: [
      { classId: "sharpshooter", levels: 3, skillsSummary: "Barrage, Crossfire, Ranged Weapon Mastery" },
      { classId: "tinkerer", levels: 2, skillsSummary: "Gadgets (SL 2: Infusions: Basic and Advanced)" },
    ],
    equipmentSummary: "Pistol, travel garb, runic shield, 70 zenit.",
    startingZenit: 70,
  },
  {
    id: "healer", name: "Healer",
    attributes: { dexterity: 6, insight: 8, might: 8, willpower: 10 },
    classLevels: [
      { classId: "orator", levels: 2, skillsSummary: "Encourage, My Trust in You" },
      { classId: "spiritist", levels: 3, skillsSummary: "Spiritual Magic (SL 3: Cleanse, Heal, Lux)" },
    ],
    equipmentSummary: "Staff, sage robe, 270 zenit.",
    startingZenit: 270,
  },
  {
    id: "magitechnician", name: "Magitechnician",
    attributes: { dexterity: 8, insight: 10, might: 6, willpower: 8 },
    classLevels: [
      { classId: "loremaster", levels: 2, skillsSummary: "Quick Assessment (SL 2)" },
      { classId: "tinkerer", levels: 3, skillsSummary: "Gadgets (SL 3: Magitech: Basic, Advanced, and Superior; magisphere spells: Elemental Shroud, Flare, Heal)" },
    ],
    equipmentSummary: "Steel dagger, sage robe, bronze shield, 120 zenit.",
    startingZenit: 120,
  },
  {
    id: "monster-mage", name: "Monster Mage",
    attributes: { dexterity: 8, insight: 6, might: 10, willpower: 8 },
    classLevels: [
      { classId: "chimerist", levels: 3, skillsSummary: "Feral Speech, Spell Mimic (SL 2)" },
      { classId: "wayfarer", levels: 1, skillsSummary: "Faithful Companion" },
      { classId: "weaponmaster", levels: 1, skillsSummary: "Breach" },
    ],
    equipmentSummary: "Broadaxe, travel garb, runic shield, 70 zenit.",
    startingZenit: 70,
  },
  {
    id: "ninja", name: "Ninja",
    attributes: { dexterity: 10, insight: 8, might: 6, willpower: 8 },
    classLevels: [
      { classId: "rogue", levels: 3, skillsSummary: "Cheap Shot, Dodge (SL 2)" },
      { classId: "spiritist", levels: 1, skillsSummary: "Spiritual Magic (Torpor)" },
      { classId: "weaponmaster", levels: 1, skillsSummary: "Counterattack" },
    ],
    equipmentSummary: "Steel dagger, shuriken, combat tunic, 120 zenit.",
    startingZenit: 120,
  },
  {
    id: "pirate", name: "Pirate",
    attributes: { dexterity: 8, insight: 6, might: 10, willpower: 8 },
    classLevels: [
      { classId: "elementalist", levels: 1, skillsSummary: "Elemental Magic (Thunderbolt)" },
      { classId: "fury", levels: 2, skillsSummary: "Adrenaline, Provoke" },
      { classId: "weaponmaster", levels: 2, skillsSummary: "Breach (SL 2)" },
    ],
    equipmentSummary: "Broadaxe, silk shirt, runic shield, 70 zenit.",
    startingZenit: 70,
  },
  {
    id: "pugilist", name: "Pugilist",
    attributes: { dexterity: 8, insight: 6, might: 10, willpower: 8 },
    classLevels: [
      { classId: "fury", levels: 3, skillsSummary: "Frenzy, Withstand (SL 2)" },
      { classId: "weaponmaster", levels: 2, skillsSummary: "Bone Crusher, Counterattack" },
    ],
    equipmentSummary: "Iron knuckle (x2), combat tunic, 120 zenit.",
    startingZenit: 120,
  },
  {
    id: "ranger", name: "Ranger",
    attributes: { dexterity: 10, insight: 8, might: 8, willpower: 6 },
    classLevels: [
      { classId: "sharpshooter", levels: 3, skillsSummary: "Ranged Weapon Mastery, Warning Shot (SL 2)" },
      { classId: "wayfarer", levels: 2, skillsSummary: "Resourceful, Well-traveled" },
    ],
    equipmentSummary: "Steel dagger, shortbow, silk shirt, 120 zenit.",
    startingZenit: 120,
  },
  {
    id: "red-sorcerer", name: "Red Sorcerer",
    attributes: { dexterity: 8, insight: 10, might: 8, willpower: 6 },
    classLevels: [
      { classId: "elementalist", levels: 3, skillsSummary: "Elemental Magic (Iceberg), Spellblade (SL 2)" },
      { classId: "spiritist", levels: 1, skillsSummary: "Spiritual Magic (Heal)" },
      { classId: "weaponmaster", levels: 1, skillsSummary: "Melee Weapon Mastery" },
    ],
    equipmentSummary: "Rapier, combat tunic, runic shield, 70 zenit.",
    startingZenit: 70,
  },
  {
    id: "sage", name: "Sage",
    attributes: { dexterity: 6, insight: 10, might: 6, willpower: 10 },
    classLevels: [
      { classId: "elementalist", levels: 3, skillsSummary: "Elemental Magic (SL 3: Fulgur, Glacies, Ignis)" },
      { classId: "loremaster", levels: 2, skillsSummary: "Flash of Insight, Focused" },
    ],
    equipmentSummary: "Tome, sage robe, 270 zenit.",
    startingZenit: 270,
  },
  {
    id: "samurai", name: "Samurai",
    attributes: { dexterity: 8, insight: 8, might: 8, willpower: 8 },
    classLevels: [
      { classId: "guardian", levels: 2, skillsSummary: "Defensive Mastery (SL 2)" },
      { classId: "spiritist", levels: 1, skillsSummary: "Spiritual Magic (Soul Weapon)" },
      { classId: "weaponmaster", levels: 2, skillsSummary: "Counterattack, Melee Weapon Mastery" },
    ],
    equipmentSummary: "Katana, runic plate, 70 zenit.",
    startingZenit: 70,
  },
  {
    id: "soldier", name: "Soldier",
    attributes: { dexterity: 8, insight: 6, might: 10, willpower: 8 },
    classLevels: [
      { classId: "guardian", levels: 2, skillsSummary: "Bodyguard, Protect" },
      { classId: "weaponmaster", levels: 3, skillsSummary: "Bone Crusher (SL 2), Breach" },
    ],
    equipmentSummary: "Bronze sword, brigandine, runic shield, 70 zenit.",
    startingZenit: 70,
  },
  {
    id: "spell-fencer", name: "Spell Fencer",
    attributes: { dexterity: 10, insight: 8, might: 6, willpower: 8 },
    classLevels: [
      { classId: "elementalist", levels: 2, skillsSummary: "Elemental Magic (SL 2: Elemental Shroud, Elemental Weapon)" },
      { classId: "spiritist", levels: 1, skillsSummary: "Spiritual Magic (Aura)" },
      { classId: "weaponmaster", levels: 2, skillsSummary: "Bladestorm, Counterattack" },
    ],
    equipmentSummary: "Rapier, silk shirt, runic shield, 120 zenit.",
    startingZenit: 120,
  },
  {
    id: "summoner", name: "Summoner",
    attributes: { dexterity: 8, insight: 8, might: 6, willpower: 10 },
    classLevels: [
      { classId: "arcanist", levels: 3, skillsSummary: "Arcane Regeneration (SL 2), Bind and Summon (Grimoire or Tower)" },
      { classId: "spiritist", levels: 2, skillsSummary: "Spiritual Magic (SL 2: Barrier, Mercy)" },
    ],
    equipmentSummary: "Staff, sage robe, 270 zenit.",
    startingZenit: 270,
  },
  {
    id: "thief", name: "Thief",
    attributes: { dexterity: 10, insight: 8, might: 6, willpower: 8 },
    classLevels: [
      { classId: "rogue", levels: 3, skillsSummary: "High Speed, Soul Steal (SL 2)" },
      { classId: "weaponmaster", levels: 2, skillsSummary: "Bone Crusher (SL 2)" },
    ],
    equipmentSummary: "Steel dagger (x2), travel garb, 170 zenit.",
    startingZenit: 170,
  },
  {
    id: "troubadour", name: "Troubadour",
    attributes: { dexterity: 10, insight: 8, might: 6, willpower: 8 },
    classLevels: [
      { classId: "orator", levels: 2, skillsSummary: "Condemn, Unexpected Ally" },
      { classId: "spiritist", levels: 2, skillsSummary: "Spiritual Magic (SL 2: Awaken, Enrage)" },
      { classId: "wayfarer", levels: 1, skillsSummary: "Well-traveled" },
    ],
    equipmentSummary: "Steel dagger, silk shirt, bronze shield, 220 zenit.",
    startingZenit: 220,
  },
  {
    id: "valkyrie", name: "Valkyrie",
    attributes: { dexterity: 8, insight: 6, might: 10, willpower: 8 },
    classLevels: [
      { classId: "elementalist", levels: 2, skillsSummary: "Elemental Magic (SL 2: Soaring Strike, Vortex)" },
      { classId: "guardian", levels: 1, skillsSummary: "Fortress" },
      { classId: "weaponmaster", levels: 2, skillsSummary: "Bladestorm, Melee Weapon Mastery" },
    ],
    equipmentSummary: "Light spear, brigandine, runic shield, 70 zenit.",
    startingZenit: 70,
  },
];
