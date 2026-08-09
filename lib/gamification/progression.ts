// ─── Levels/XP (personal progression) ────────────────────────────────────────
// A flat curve — 100 XP per level — kept intentionally simple so it can be
// retuned later without a migration (level is derived from shg_users.xp at
// read time, never stored).

const XP_PER_LEVEL = 100;

export function levelForXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

/** XP thresholds bounding the current level, for progress-bar rendering. */
export function levelProgress(xp: number): { level: number; xpIntoLevel: number; xpForLevel: number } {
  const level = levelForXp(xp);
  const xpAtLevelStart = (level - 1) * XP_PER_LEVEL;
  return { level, xpIntoLevel: xp - xpAtLevelStart, xpForLevel: XP_PER_LEVEL };
}
