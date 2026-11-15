import { Gift, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SheetBenefit {
  id:          string;
  name:        string;
  /** What it does, in a line (describeBenefit). */
  summary:     string;
  description: string | null;
  /** Unlocked: "Te quedan 2 este mes", "Se aplica solo"… Locked: what's missing. */
  status:      string | null;
}

export function BenefitCard({ benefit, locked = false }: { benefit: SheetBenefit; locked?: boolean }) {
  const Icon = locked ? Lock : Gift;
  return (
    <div className="flex gap-3 px-3.5 py-3 border border-parchment-deep bg-white/40">
      <Icon size={20} strokeWidth={1.7} className={cn("shrink-0 mt-0.5", locked ? "text-brass-dark" : "text-crimson")} aria-hidden />
      <div className="min-w-0">
        <p className="font-body font-semibold text-lg leading-tight text-ink-heading">{benefit.name}</p>
        {benefit.summary !== benefit.name && <p className="font-body text-[15px] text-ink">{benefit.summary}</p>}
        {benefit.description && <p className="font-body text-sm italic text-ink-light">{benefit.description}</p>}
        {benefit.status && (
          <p className={cn(
            "font-display text-[11px] uppercase tracking-[0.1em] mt-1",
            locked ? "text-crimson font-semibold" : "text-brass-dark"
          )}>
            {benefit.status}
          </p>
        )}
      </div>
    </div>
  );
}
