import type { ShgRolGuildRank } from "@/types/database";

/** Highest rank whose points_threshold the given points meet, or null if
 *  points fall below every rank's threshold. Mirrors the SQL in
 *  shg_rol_complete_quest() — keep both in sync. */
export function computeRank(points: number, ranks: ShgRolGuildRank[]): ShgRolGuildRank | null {
  let best: ShgRolGuildRank | null = null;
  for (const rank of ranks) {
    if (rank.points_threshold <= points && (!best || rank.points_threshold > best.points_threshold)) {
      best = rank;
    }
  }
  return best;
}

/** The next rank above the character's current one (by points_threshold), or
 *  null if already at (or above) the highest defined rank. */
export function nextRank(points: number, ranks: ShgRolGuildRank[]): ShgRolGuildRank | null {
  let best: ShgRolGuildRank | null = null;
  for (const rank of ranks) {
    if (rank.points_threshold > points && (!best || rank.points_threshold < best.points_threshold)) {
      best = rank;
    }
  }
  return best;
}
