import { Home, Building2, Castle, Landmark, Pickaxe, TreePine, Skull, Anchor, Church, Tent, MapPin, type LucideIcon } from "lucide-react";

export interface RolLocationType {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const LOCATION_TYPES: RolLocationType[] = [
  { id: "town", label: "Pueblo", icon: Home },
  { id: "city", label: "Ciudad", icon: Building2 },
  { id: "fortress", label: "Fortaleza", icon: Castle },
  { id: "tower", label: "Torre", icon: Landmark },
  { id: "mine", label: "Mina", icon: Pickaxe },
  { id: "forest", label: "Bosque", icon: TreePine },
  { id: "ruin", label: "Ruina", icon: Skull },
  { id: "port", label: "Puerto", icon: Anchor },
  { id: "temple", label: "Templo", icon: Church },
  { id: "camp", label: "Campamento", icon: Tent },
  { id: "other", label: "Otro", icon: MapPin },
];

export function iconForLocationType(type: string): LucideIcon {
  return LOCATION_TYPES.find((t) => t.id === type)?.icon ?? MapPin;
}

export function labelForLocationType(type: string): string {
  return LOCATION_TYPES.find((t) => t.id === type)?.label ?? type;
}
