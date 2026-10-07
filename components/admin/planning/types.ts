import type { ShgTask } from "@/types/database";

export interface PlanningTask extends ShgTask {
  assignee: { id: string; name: string } | null;
  comment_count: number;
}
