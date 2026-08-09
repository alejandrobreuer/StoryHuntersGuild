import type { ShgRank } from "@/types/database";

/** Highest rank the user's RP qualifies for, or null if below the lowest tier. */
export function currentRank(rp: number, ranks: ShgRank[]): ShgRank | null {
  const sorted = [...ranks].sort((a, b) => b.rp_required - a.rp_required);
  return sorted.find((r) => rp >= r.rp_required) ?? null;
}

/** Next rank to work towards, or null if already at (or above) the highest tier. */
export function nextRank(rp: number, ranks: ShgRank[]): ShgRank | null {
  const sorted = [...ranks].sort((a, b) => a.rp_required - b.rp_required);
  return sorted.find((r) => rp < r.rp_required) ?? null;
}
