import type { EventType } from "@/types/database";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  cooperative:   "Noche cooperativa",
  competitive:   "Noche competitiva",
  tournament:    "Torneo",
  release:       "Lanzamiento",
  guilds_choice: "Elección del gremio",
};
