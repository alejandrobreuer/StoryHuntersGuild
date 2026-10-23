import type { GameComplexity, GameStatus } from "@/types/database";

// Ludoteca filter options, shared by the sidebar (labels, URL params) and the
// /games page query (what each option means). Every list filter lives in the
// URL as a comma-separated param; options within a section are OR-ed, and
// sections are AND-ed with each other.

export interface FilterOption {
  value: string;
  label: string;
}

/** Ranges a game supports at least one player count in. */
export const PLAYER_OPTIONS = [
  { value: "1",   label: "1 (solitario)", min: 1, max: 1 },
  { value: "2",   label: "2",             min: 2, max: 2 },
  { value: "3-4", label: "3–4",           min: 3, max: 4 },
  { value: "5+",  label: "5 o más",       min: 5, max: Infinity },
] as const;

export const PLAYTIME_OPTIONS = [
  { value: "short",  label: "Menos de 30 min", min: 0,  max: 29 },
  { value: "medium", label: "30–60 min",       min: 30, max: 60 },
  { value: "long",   label: "Más de 1 h",      min: 61, max: Infinity },
] as const;

export const COMPLEXITY_OPTIONS: { value: GameComplexity; label: string }[] = [
  { value: "light",  label: "Fácil" },
  { value: "medium", label: "Intermedio" },
  { value: "heavy",  label: "Avanzado" },
];

export const STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
  { value: "available",     label: "Disponible" },
  { value: "request_ahead", label: "Solicitar con tiempo" },
  { value: "unavailable",   label: "No disponible" },
];

/** Reads a comma-separated list param, keeping only known values. */
export function parseListParam<T extends string>(raw: string | undefined, allowed?: readonly T[]): T[] {
  const values = (raw ?? "").split(",").filter(Boolean) as T[];
  return allowed ? values.filter((v) => allowed.includes(v)) : values;
}

/** PostgREST `or` condition matching any of the selected player ranges. */
export function playersCondition(values: string[]): string | null {
  const conds = PLAYER_OPTIONS.filter((o) => values.includes(o.value)).map((o) =>
    // The game's [min, max] overlaps the option's range.
    o.max === Infinity ? `max_players.gte.${o.min}` : `and(min_players.lte.${o.max},max_players.gte.${o.min})`
  );
  return conds.length ? conds.join(",") : null;
}

/** PostgREST `or` condition matching any of the selected playtime ranges. */
export function playtimeCondition(values: string[]): string | null {
  const conds = PLAYTIME_OPTIONS.filter((o) => values.includes(o.value)).map((o) =>
    o.max === Infinity ? `playtime_minutes.gte.${o.min}` : `and(playtime_minutes.gte.${o.min},playtime_minutes.lte.${o.max})`
  );
  return conds.length ? conds.join(",") : null;
}
