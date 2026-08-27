import { Home, Building2, Castle, Landmark, Pickaxe, TreePine, Skull, Anchor, Church, Tent, MapPin, type LucideIcon } from "lucide-react";

export interface RolLocationType {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Relative pin size on the map — cities/fortresses read as bigger than a town or camp. */
  scale: number;
}

export const LOCATION_TYPES: RolLocationType[] = [
  { id: "town", label: "Pueblo", icon: Home, scale: 0.85 },
  { id: "city", label: "Ciudad", icon: Building2, scale: 1.35 },
  { id: "fortress", label: "Fortaleza", icon: Castle, scale: 1.35 },
  { id: "tower", label: "Torre", icon: Landmark, scale: 1 },
  { id: "mine", label: "Mina", icon: Pickaxe, scale: 1 },
  { id: "forest", label: "Bosque", icon: TreePine, scale: 1 },
  { id: "ruin", label: "Ruina", icon: Skull, scale: 1 },
  { id: "port", label: "Puerto", icon: Anchor, scale: 1 },
  { id: "temple", label: "Templo", icon: Church, scale: 1 },
  { id: "camp", label: "Campamento", icon: Tent, scale: 0.75 },
  { id: "other", label: "Otro", icon: MapPin, scale: 1 },
];

export function iconForLocationType(type: string): LucideIcon {
  return LOCATION_TYPES.find((t) => t.id === type)?.icon ?? MapPin;
}

export function labelForLocationType(type: string): string {
  return LOCATION_TYPES.find((t) => t.id === type)?.label ?? type;
}

export function scaleForLocationType(type: string): number {
  return LOCATION_TYPES.find((t) => t.id === type)?.scale ?? 1;
}
