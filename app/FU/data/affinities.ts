/**
 * Elemental affinities — Fabula_Ultima_Guide.pdf, "AFFINITIES" (p.94-95).
 * The 8 elements are confirmed against this repo's own class/equipment data
 * (every one of these appears on a weapon, spell, or skill already in
 * app/FU/data/classes/* and equipment.ts).
 */

export type AffinityStatus = "normal" | "resistant" | "vulnerable" | "immune" | "absorb";

export interface FUElement {
  id: string;
  name: string;
}

export const elements: FUElement[] = [
  { id: "fire", name: "Fuego" },
  { id: "ice", name: "Hielo" },
  { id: "air", name: "Aire" },
  { id: "bolt", name: "Rayo" },
  { id: "earth", name: "Tierra" },
  { id: "light", name: "Luz" },
  { id: "dark", name: "Oscuridad" },
  { id: "poison", name: "Veneno" },
];

export const affinityStatusOrder: AffinityStatus[] = ["vulnerable", "normal", "resistant", "immune", "absorb"];

export const affinityStatusLabels: Record<AffinityStatus, string> = {
  vulnerable: "Vulnerable",
  normal: "Normal",
  resistant: "Resistente",
  immune: "Inmune",
  absorb: "Absorbe",
};

export const affinitiesRulesNote =
  "Vulnerable: recibís el doble de daño de ese elemento. Resistente: recibís la mitad (redondeado " +
  "hacia abajo). Inmune: no recibís daño ni efectos de ese elemento. Absorbe: el daño de ese " +
  "elemento te cura en lugar de dañarte.";
