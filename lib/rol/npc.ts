// Shared NPC shapes/helpers — used by both the public /rol/npcs roster and
// the /rol guild page's Guild Staff section, which both render the same
// NpcDetailModal (components/rol/npc/NpcDetailModal.tsx). Plain data/logic
// only (no "use client"), safe to import from a Server Component too.

import type { RolNpcStanding } from "@/types/database";

export interface FactionRef {
  id:         string;
  name:       string;
  sort_order: number;
}

export interface NpcFactionLink {
  is_former: boolean;
  faction:   FactionRef | FactionRef[] | null;
}

export interface NpcLocationRef {
  id:   string;
  name: string;
}

export interface NpcRow {
  id:             string;
  name:           string;
  description:    string;
  standing:       RolNpcStanding;
  portrait_url:   string | null;
  full_body_url:  string | null;
  residence:      NpcLocationRef | NpcLocationRef[] | null;
  origin:         NpcLocationRef | NpcLocationRef[] | null;
  factions:       NpcFactionLink[];
  tags:           string[];
}

export function oneOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
