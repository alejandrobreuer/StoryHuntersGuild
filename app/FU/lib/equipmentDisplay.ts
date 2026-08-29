/**
 * Shared "what does this item actually do" formatting for weapons/armor/
 * shields — used by both the creation wizard's EquipmentBoard/EquipmentCard
 * and the character sheet's Inventario panel, so an item reads the same way
 * everywhere it appears instead of two components drifting apart.
 */
import type { FUArmor, FUShield, FUWeapon } from "../data/types";

export interface EquipmentCardData {
  id: string;
  name: string;
  cost: number | null;
  martial: boolean;
  statLine: string;
  notes: string;
}

export function weaponCardData(w: FUWeapon): EquipmentCardData {
  return {
    id: w.id, name: w.name, cost: w.cost, martial: w.martial,
    statLine: `${w.accuracy} → ${w.damage}`,
    notes: `${w.handedness === "two-handed" ? "Dos manos" : "Una mano"} · ${w.range === "melee" ? "Cuerpo a cuerpo" : "A distancia"} · ${w.category}. ${w.notes}`,
  };
}

export function armorCardData(a: FUArmor): EquipmentCardData {
  const def = "fixed" in a.defense ? `${a.defense.fixed}` : `DEX${a.defense.dexPlus ? ` +${a.defense.dexPlus}` : ""}`;
  const mdef = "fixed" in a.magicDefense ? `${a.magicDefense.fixed}` : `INS${a.magicDefense.insPlus ? ` +${a.magicDefense.insPlus}` : ""}`;
  return { id: a.id, name: a.name, cost: a.cost, martial: a.martial, statLine: `Def ${def} · Def.M ${mdef} · Ini ${a.initiative}`, notes: a.notes };
}

export function shieldCardData(s: FUShield): EquipmentCardData {
  return { id: s.id, name: s.name, cost: s.cost, martial: s.martial, statLine: `Def +${s.defenseBonus} · Def.M +${s.magicDefenseBonus}`, notes: s.notes };
}

export function equipmentCardData(item: FUWeapon | FUArmor | FUShield): EquipmentCardData {
  if ("accuracy" in item) return weaponCardData(item);
  if ("defenseBonus" in item) return shieldCardData(item);
  return armorCardData(item);
}
