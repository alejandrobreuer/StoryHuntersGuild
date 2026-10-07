import { todayISOInEventTimeZone } from "@/lib/formatting";
import type { PlanningTaskStatus } from "@/types/database";

// due_date/the "today" it's compared against are both plain yyyy-mm-dd
// strings (see toISODateInEventTimeZone/todayISOInEventTimeZone in
// lib/formatting.ts) — zero-padded ISO dates sort lexicographically the
// same as chronologically, so plain string comparison is enough and avoids
// re-introducing a timezone-ambiguous `Date` object into the comparison.

export function isTaskOverdue(dueDate: string | null, status: PlanningTaskStatus): boolean {
  if (!dueDate || status === "done") return false;
  return dueDate < todayISOInEventTimeZone();
}

/** Adds/subtracts whole days from a plain yyyy-mm-dd date, via Date.UTC so
 * the result never depends on the server's local timezone. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Epic due_date defaulted from a linked event's due_offset_days before it,
 * per the template flow — null propagates (no due date in, no due date out). */
export function subtractDaysISO(iso: string | null, days: number | null): string | null {
  if (!iso || days === null || days === undefined) return null;
  return addDaysISO(iso, -days);
}

/** Whole days from `b` to `a` (positive when `a` is later) — used by
 * "save as template" to turn a task's actual due_date back into an
 * offset-before-the-epic's-due-date number. */
function daysBetweenISO(a: string, b: string): number {
  const toUTC = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUTC(a) - toUTC(b)) / 86_400_000);
}

/** Only computed when both dates exist; clamped into the column's 0–365
 * check constraint range (a task due *after* the epic, though unusual, must
 * not produce a negative/out-of-range offset). */
export function dueOffsetDaysFor(epicDueDate: string | null, taskDueDate: string | null): number | null {
  if (!epicDueDate || !taskDueDate) return null;
  return Math.max(0, Math.min(365, daysBetweenISO(epicDueDate, taskDueDate)));
}

const SHORT_MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const SHORT_WEEKDAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Formats a plain yyyy-mm-dd directly from its digits — deliberately not
// `new Date(iso).toLocaleDateString(..., {timeZone: EVENT_TIME_ZONE})`,
// which would first parse the date-only string as UTC midnight and then
// shift it back a day when rendered in the UTC-3 Buenos Aires zone.
export function formatPlanningDate(iso: string, opts: { weekday?: boolean } = {}): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = `${d} ${SHORT_MONTHS_ES[m - 1]}`;
  if (!opts.weekday) return base;
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${SHORT_WEEKDAYS_ES[dow]} ${base}`;
}

export type MyTasksGroupName = "overdue" | "this_week" | "later" | "no_due_date" | "done";

export const MY_TASKS_GROUP_LABEL: Record<MyTasksGroupName, string> = {
  overdue:     "Atrasadas",
  this_week:   "Esta semana",
  later:       "Más adelante",
  no_due_date: "Sin fecha",
  done:        "Hechas",
};

export const MY_TASKS_GROUP_ORDER: MyTasksGroupName[] = ["overdue", "this_week", "later", "no_due_date", "done"];

/** Which "my tasks" bucket a task falls into, given its due_date/status and
 * today's date (both plain yyyy-mm-dd, Buenos Aires). "This week" runs
 * through the coming Sunday (week starts Monday, matching es-AR convention). */
export function myTasksGroupFor(dueDate: string | null, status: PlanningTaskStatus, today: string): MyTasksGroupName {
  if (!dueDate) return "no_due_date";
  if (isTaskOverdue(dueDate, status)) return "overdue";

  const todayUtc = new Date(`${today}T00:00:00Z`);
  const dow = todayUtc.getUTCDay(); // 0 = Sunday
  const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
  const endOfWeek = addDaysISO(today, daysUntilSunday);

  return dueDate <= endOfWeek ? "this_week" : "later";
}
