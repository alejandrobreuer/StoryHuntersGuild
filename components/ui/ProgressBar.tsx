import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  /** Adds a subtle light sweep across the filled portion — for bars that need to feel "alive". */
  animated?: boolean;
}

export function ProgressBar({ value, max, className, trackClassName, fillClassName, animated }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn("h-3 w-full rounded-full bg-parchment-dark/40 overflow-hidden", trackClassName, className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r from-brass to-crimson transition-all duration-700 relative overflow-hidden", fillClassName)}
        style={{ width: `${pct}%` }}
      >
        {animated && (
          <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/55 to-transparent" />
        )}
      </div>
    </div>
  );
}
