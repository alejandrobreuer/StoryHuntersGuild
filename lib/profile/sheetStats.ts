// ─── Character-sheet stats (cosmetic) ───────────────────────────────────────
// Vida, Inspiración and Aguante on the profile page are decoration only: no
// data behind them, nothing stored, always shown full. Their max grows with
// the player's level so leveling up visibly changes the sheet. Tweak here.

export const SHEET_STATS = [
  { key: "vida",        label: "Vida",        base: 100, perLevel: 10, tone: "crimson" },
  { key: "inspiracion", label: "Inspiración", base: 100, perLevel: 8,  tone: "gold" },
  { key: "aguante",     label: "Aguante",     base: 100, perLevel: 5,  tone: "moss" },
] as const;

export type SheetTone = (typeof SHEET_STATS)[number]["tone"];

/** Max value of each stat at `level` (level 1 = base). */
export function sheetStats(level: number) {
  const above = Math.max(0, level - 1);
  return SHEET_STATS.map((s) => ({ key: s.key, label: s.label, tone: s.tone, max: s.base + s.perLevel * above }));
}
