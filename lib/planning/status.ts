import type { PlanningEpicStatus, PlanningTaskStatus } from "@/types/database";

// This app's palette has no blue (the mockups use one for "in progress") —
// mapped onto the four accent tokens that already exist instead of adding a
// new one. leather-light = neutral/not-started, brass = active, crimson =
// danger/blocked, moss = success/done — same roles those tokens play
// everywhere else in the admin panel (see lib/gamification/gameStatusInfo.ts).

export const EPIC_STATUS_LABEL: Record<PlanningEpicStatus, string> = {
  planning:    "Planificando",
  in_progress: "En progreso",
  done:        "Hecho",
  cancelled:   "Cancelado",
};

export const EPIC_STATUS_BADGE_CLASS: Record<PlanningEpicStatus, string> = {
  planning:    "bg-leather-light/15 text-leather-light",
  in_progress: "bg-brass/15 text-brass",
  done:        "bg-moss/15 text-moss-dark",
  cancelled:   "bg-leather-light/15 text-leather-light line-through",
};

export const TASK_STATUS_LABEL: Record<PlanningTaskStatus, string> = {
  todo:        "Por hacer",
  in_progress: "En progreso",
  blocked:     "Bloqueado",
  done:        "Hecho",
};

export const TASK_STATUS_BADGE_CLASS: Record<PlanningTaskStatus, string> = {
  todo:        "bg-leather-light/15 text-leather-light",
  in_progress: "bg-brass/15 text-brass",
  blocked:     "bg-crimson/15 text-crimson",
  done:        "bg-moss/15 text-moss-dark",
};

export const TASK_STATUS_DOT_CLASS: Record<PlanningTaskStatus, string> = {
  todo:        "bg-leather-light",
  in_progress: "bg-brass",
  blocked:     "bg-crimson",
  done:        "bg-moss",
};

export const TASK_STATUS_ORDER: PlanningTaskStatus[] = ["todo", "in_progress", "blocked", "done"];
