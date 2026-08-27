import type { RolNpcStanding } from "@/types/database";

export interface RolNpcStandingOption {
  id:         RolNpcStanding;
  label:      string;
  badgeClass: string;
}

export const NPC_STANDINGS: RolNpcStandingOption[] = [
  { id: "hostile",    label: "Hostil",    badgeClass: "bg-crimson/15 text-crimson" },
  { id: "unfriendly", label: "Recelosa",  badgeClass: "bg-leather/15 text-leather" },
  { id: "neutral",    label: "Neutral",   badgeClass: "bg-border/40 text-ink-light" },
  { id: "friendly",   label: "Amistosa",  badgeClass: "bg-brass/15 text-brass" },
  { id: "allied",     label: "Aliada",    badgeClass: "bg-moss/15 text-moss-dark" },
];

export function labelForStanding(standing: string): string {
  return NPC_STANDINGS.find((s) => s.id === standing)?.label ?? standing;
}

export function badgeClassForStanding(standing: string): string {
  return NPC_STANDINGS.find((s) => s.id === standing)?.badgeClass ?? "bg-border/40 text-ink-light";
}
