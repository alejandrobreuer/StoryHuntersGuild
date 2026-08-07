/**
 * Identity/Theme/Name creation tables — transcribed from
 * identity-tables.txt, themes.txt and names.txt.
 *
 * The source presents Core Concept and Adjectives as d6-gated column pairs
 * (rolled with a d6 to pick a column, then a d20 for the entry) — for an
 * app "roll for me" helper we don't need to preserve the column/d6 split,
 * so each table is flattened to a single list in source reading order
 * (column-by-column, top-to-bottom).
 */
import type { FUIdentityTables, FUTheme } from "./types";

export const identityTables: FUIdentityTables = {
  coreConcept: [
    // 1-2
    "Knight", "Bounty Hunter", "Martial Artist", "Treasure Hunter", "Alien",
    "Priest/ess", "Professor", "Samurai", "Bard", "Soldier",
    "Inventor", "Smuggler", "Automaton", "Ninja", "Diplomat",
    "Thief", "King/Queen", "Mage", "Gladiator", "Prince/ss",
    // 3-4
    "Bodyguard", "Bandit", "Factory Worker", "Student", "Painter",
    "Magitech Engineer", "Archer", "Occultist", "Paladin", "Monk",
    "Gunslinger", "Black Knight", "Alchemist", "Airship Pilot", "Spy",
    "Templar", "Mechanic", "Dancer", "Cannoneer", "Merchant",
    // 5-6
    "Animated Puppet", "Scavenger", "Rebel Agent", "Warrior Mage", "Noble",
    "Duelist", "Monster Hunter", "Medic", "Shapeshifter", "Pirate",
    "Gambler", "Rōnin", "Mercenary", "Cook", "Commander",
    "Sniper", "Athlete", "Healer", "Demon Hunter", "Abomination",
  ],
  adjectives: [
    // 1-3
    "Charming", "Oathbreaker", "Chosen", "Former Imperial", "Troubled",
    "Brave", "Animal-loving", "Amnesiac", "Dashing", "Imperial",
    "Free-spirited", "Loyal", "Elderly", "Chivalrous", "Smiling",
    "No-nonsense", "Apprentice", "Influent", "Ill-tempered", "Tough",
    // 4-6
    "Devout", "Last", "Distant", "Proud", "Wanted",
    "Fearful", "Kind", "Respectable", "Tainted", "Young",
    "Eccentric", "Well-connected", "Naive", "Spoiled", "Gifted",
    "Royal", "Reckless", "Furtive", "Famous", "Non-human*",
  ],
  details: [
    "from an Ancient Bloodline", "on the Run", "of the Old Faith", "Seeking Justice",
    "in Disgrace", "of the Crimson Wings", "from the High Academy", "from the Moon",
    "of the Seven Seas", "from the Future", "looking for Answers", "without a Homeland",
    "of the Royal Army", "from Another Dimension", "of the Desert Clans", "of the Storm Knights",
    "with a Heart of Gold", "from the Ancient Forest", "from the Past", "of the Sacred Flame",
  ],
};

/** "*" on Non-human — see identity-tables.txt footnote: pick a species that fits the world (dwarf, elf, saurian, half-dragon, ...). */
export const nonHumanNote =
  "Select a species such as dwarf, elf, saurian, half-dragon, or anything that would make sense in your world.";

export const themes: FUTheme[] = [
  { name: "Ambition", description: "You strive to prove your worth to yourself and/or others." },
  { name: "Anger", description: "You are a ticking bomb, always on the brink of rage." },
  { name: "Belonging", description: "You are afraid of being alone, forgotten or abandoned." },
  { name: "Doubt", description: "You need to find the answer to a burning question." },
  { name: "Duty", description: "You live to fulfill a promise you made or obey an order you received." },
  { name: "Guilt", description: "You wish to atone for your past mistakes." },
  { name: "Hope", description: "You seek a better world for yourself and/or others." },
  { name: "Justice", description: "You always side with the weak and defenseless." },
  { name: "Mercy", description: "You wish to help others, regardless of their past misdeeds." },
  { name: "Vengeance", description: "You seek to bring retribution upon someone or something." },
];

/** Character Names table — flattened in source reading order (row-major). */
export const characterNames: string[] = [
  "Abel", "Croma", "Gray", "Maha", "Royce",
  "Adalbert", "Cross", "Gregor", "Mako", "Runo",
  "Agnes", "Crow", "Grimm", "Markus", "Sabine",
  "Aiko", "Cynthia", "Gyle", "Maribel", "Sabra",
  "Alberic", "Daige", "Halia", "Minerva", "Sarah",
  "Albin", "Dale", "Hanna", "Miranda", "Selene",
  "Almond", "Daphne", "Hanzel", "Momo", "Silas",
  "Andreas", "Denys", "Harper", "Monica", "Silida",
  "Angela", "Divel", "Hera", "Montblanc", "Solomon",
  "Ashe", "Edel", "Hope", "Morgan", "Sonya",
  "Astor", "Edgar", "Ilyen", "Nadia", "Talon",
  "Aya", "Edna", "Inja", "Neela", "Tamara",
  "Azel", "Eko", "Isabella", "Neto", "Tharja",
  "Azura", "Eleanor", "Izanne", "Nibel", "Therese",
  "Baern", "Elise", "Jabari", "Nico", "Thomas",
  "Belka", "Emet", "Jeanne", "Noah", "Tika",
  "Berenice", "Eric", "Joel", "Noor", "Toris",
  "Biel", "Etrian", "Jun", "Nyles", "Tristan",
  "Blair", "Fabian", "Kallan", "Ode", "Uma",
  "Blanche", "Fedra", "Kaspar", "Olivia", "Undine",
  "Bow", "Felicia", "Lara", "Oona", "Usher",
  "Bram", "Fenis", "Langa", "Orion", "Valea",
  "Brandon", "Finn", "Lansel", "Orne", "Veronica",
  "Bryde", "Fionne", "Laurence", "Osira", "Vikes",
  "Cale", "Forrest", "Lazom", "Owen", "Vincent",
  "Camilla", "Fraan", "Leanna", "Pharia", "Vosca",
  "Cassandra", "Francisca", "Leda", "Prim", "Winter",
  "Celeste", "Frederick", "Liam", "Pyre", "Xenia",
  "Cetra", "Galatea", "Locke", "Remora", "Yado",
  "Cinder", "Garlan", "Logan", "Ricard", "Yin",
  "Clarimonde", "Garm", "Loren", "Riza", "Ylua",
  "Clarissa", "Gilpher", "Lucian", "Robin", "Yuri",
  "Clemence", "Gizal", "Lulu", "Rolan", "Zen",
  "Conner", "Glenn", "Lumi", "Rosa", "Zima",
];
