import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
}

export function ProgressBar({ value, max, className, trackClassName, fillClassName }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn("h-3 w-full rounded-full bg-parchment-dark/40 overflow-hidden", trackClassName, className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r from-brass to-crimson transition-all duration-500", fillClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
