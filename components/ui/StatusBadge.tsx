import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types/database";

const LABELS: Record<BookingStatus, string> = {
  pending:   "Pendiente",
  approved:  "Confirmada",
  rejected:  "Rechazada",
  cancelled: "Cancelada",
};

const STYLES: Record<BookingStatus, string> = {
  pending:   "bg-brass/15 text-brass-light border-brass/40",
  approved:  "bg-moss/15 text-moss-light border-moss/40",
  rejected:  "bg-crimson/15 text-crimson border-crimson/40",
  cancelled: "bg-leather-light/15 text-leather-lighter border-leather-light/40",
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <span className={cn(
      "inline-block font-label text-2xs font-bold uppercase tracking-widest px-2.5 py-1 border rounded-sm",
      STYLES[status], className
    )}>
      {LABELS[status]}
    </span>
  );
}
