import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AssigneeAvatar } from "@/components/admin/planning/AssigneeAvatar";
import { EPIC_STATUS_LABEL, EPIC_STATUS_BADGE_CLASS } from "@/lib/planning/status";
import { formatPlanningDate } from "@/lib/planning/dates";
import { cn } from "@/lib/utils";
import type { ShgEpic } from "@/types/database";

export interface EpicCardData extends ShgEpic {
  event: { id: string; title: string; starts_at: string } | null;
  owner: { id: string; name: string } | null;
  total: number;
  done: number;
  blocked: number;
  overdue: number;
}

export function EpicCard({ epic }: { epic: EpicCardData }) {
  return (
    <Link
      href={`/admin/planning/${epic.id}`}
      className="flex flex-col gap-3.5 p-5 surface-parchment hover:-translate-y-0.5 transition-transform"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("font-label text-2xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-sm", EPIC_STATUS_BADGE_CLASS[epic.status])}>
          {EPIC_STATUS_LABEL[epic.status]}
        </span>
        {epic.due_date && (
          <span className="flex items-center gap-1.5 font-label text-xs text-ink-light">
            <CalendarDays size={14} /> Vence {formatPlanningDate(epic.due_date)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-bold text-ink leading-tight">{epic.title}</h3>
        <p className="font-body text-sm text-ink-light">{epic.event ? epic.event.title : "Sin evento vinculado"}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between font-label text-xs text-leather-light">
          <span>{epic.done} de {epic.total} tareas</span>
          <span>{epic.total > 0 ? Math.round((epic.done / epic.total) * 100) : 0}%</span>
        </div>
        <ProgressBar value={epic.done} max={epic.total} className="h-2" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AssigneeAvatar name={epic.owner?.name} />
          <span className="font-body text-sm text-ink-light">{epic.owner?.name ?? "Sin dueño"}</span>
        </div>
        <div className="flex gap-1.5 font-label text-2xs">
          {epic.blocked > 0 && (
            <span className="px-2 py-0.5 rounded-sm bg-crimson/15 text-crimson">{epic.blocked} bloqueada{epic.blocked === 1 ? "" : "s"}</span>
          )}
          {epic.overdue > 0 && (
            <span className="px-2 py-0.5 rounded-sm bg-brass/20 text-brass">{epic.overdue} atrasada{epic.overdue === 1 ? "" : "s"}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
