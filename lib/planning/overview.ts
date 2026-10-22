import { toISODateInEventTimeZone } from "@/lib/formatting";
import type { PlanningTaskStatus } from "@/types/database";

// Planning → Resumen: every task of every live epic in three columns, each
// grouped by epic. Pure functions so the column/date rules are testable.

export type OverviewColumn = "unassigned" | "assigned" | "done";

export const OVERVIEW_COLUMNS: OverviewColumn[] = ["unassigned", "assigned", "done"];

export const OVERVIEW_COLUMN_LABEL: Record<OverviewColumn, string> = {
  unassigned: "Sin asignar",
  assigned:   "Asignadas",
  done:       "Completadas",
};

interface OverviewTaskLike {
  status:       PlanningTaskStatus;
  assignee_id:  string | null;
  created_at:   string;
  completed_at: string | null;
}

/** Completed wins over assignment: a done task is "Completadas" whoever did it. */
export function overviewColumnFor(task: OverviewTaskLike): OverviewColumn {
  if (task.status === "done") return "done";
  return task.assignee_id ? "assigned" : "unassigned";
}

/** Creation / close date of a task as a Buenos Aires yyyy-mm-dd. */
export function createdOn(task: Pick<OverviewTaskLike, "created_at">): string {
  return toISODateInEventTimeZone(task.created_at);
}
export function closedOn(task: Pick<OverviewTaskLike, "completed_at">): string | null {
  return task.completed_at ? toISODateInEventTimeZone(task.completed_at) : null;
}

/** The date the Desde/Hasta filter looks at: when a completed task was
 * closed, when an open one was created. "" = no bound on that side. */
export function inDateRange(task: OverviewTaskLike, from: string, to: string): boolean {
  if (!from && !to) return true;
  const date = (task.status === "done" ? closedOn(task) : null) ?? createdOn(task);
  return (!from || date >= from) && (!to || date <= to);
}

export interface EpicGroup<T> {
  epic: { id: string; title: string };
  tasks: T[];
}

/** Tasks grouped by epic, epics in the order given, empty epics dropped. */
export function groupByEpic<T extends { epic_id: string }>(
  tasks: T[], epics: { id: string; title: string }[],
): EpicGroup<T>[] {
  const byEpic = new Map<string, T[]>();
  for (const t of tasks) {
    const list = byEpic.get(t.epic_id);
    if (list) list.push(t); else byEpic.set(t.epic_id, [t]);
  }
  return epics
    .filter((e) => byEpic.has(e.id))
    .map((e) => ({ epic: e, tasks: byEpic.get(e.id)! }));
}
