import type { FUClass } from "./types";
import { arcanist } from "./classes/arcanist";
import { chimerist } from "./classes/chimerist";
import { darkblade } from "./classes/darkblade";
import { elementalist } from "./classes/elementalist";
import { entropist } from "./classes/entropist";
import { fury } from "./classes/fury";
import { guardian } from "./classes/guardian";
import { loremaster } from "./classes/loremaster";
import { orator } from "./classes/orator";
import { rogue } from "./classes/rogue";
import { sharpshooter } from "./classes/sharpshooter";
import { spiritist } from "./classes/spiritist";
import { tinkerer } from "./classes/tinkerer";
import { wayfarer } from "./classes/wayfarer";
import { weaponmaster } from "./classes/weaponmaster";

export const classes: FUClass[] = [
  arcanist,
  chimerist,
  darkblade,
  elementalist,
  entropist,
  fury,
  guardian,
  loremaster,
  orator,
  rogue,
  sharpshooter,
  spiritist,
  tinkerer,
  wayfarer,
  weaponmaster,
];

export const classesById: Record<string, FUClass> = Object.fromEntries(
  classes.map((c) => [c.id, c]),
);
