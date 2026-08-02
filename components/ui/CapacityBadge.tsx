import { Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

interface CapacityBadgeProps {
  remaining: number;
  className?: string;
}

/** "Crosshair-seal" capacity badge — implementable with zero custom art via
 * lucide-react's Crosshair icon as the decorative ring; can be swapped for
 * bespoke crosshair-seal artwork later. */
export function CapacityBadge({ remaining, className }: CapacityBadgeProps) {
  const full = remaining <= 0;
  return (
    <div
      className={cn(
        "relative flex size-16 shrink-0 items-center justify-center rounded-full border-2 shadow-seal",
        full ? "bg-leather border-leather-light" : "bg-crimson border-brass",
        className
      )}
    >
      <Crosshair
        size={64}
        strokeWidth={0.75}
        className={cn("absolute inset-0", full ? "text-leather-lighter/40" : "text-brass-light/50")}
      />
      <div className="relative flex flex-col items-center leading-none">
        <span className="font-label text-lg font-bold text-parchment">{full ? "0" : remaining}</span>
        <span className="font-label text-[0.5rem] uppercase tracking-widest text-parchment/80">
          {full ? "Lleno" : "lugares"}
        </span>
      </div>
    </div>
  );
}
