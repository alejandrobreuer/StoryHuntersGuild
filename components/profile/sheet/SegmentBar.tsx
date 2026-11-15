import { cn } from "@/lib/utils";
import type { SheetTone } from "@/lib/profile/sheetStats";

const TONE: Record<SheetTone, string> = {
  crimson: "bg-crimson",
  gold:    "bg-brass-light",
  moss:    "bg-moss-light",
};

interface SegmentBarProps {
  /** 0–1 share of the bar that's filled; rounded down to whole segments. */
  value:      number;
  tone:       SheetTone;
  label:      string;
  segments?:  number;
  className?: string;
}

/** A game-style bar split into segments on a dark track. Filled segments
 * pop in on load, only when the visitor allows motion. */
export function SegmentBar({ value, tone, label, segments = 20, className }: SegmentBarProps) {
  const filled = Math.max(0, Math.min(segments, Math.floor(value * segments + 1e-9)));
  return (
    <div role="img" aria-label={label} className={cn("flex gap-[2px] h-3.5 p-[2px] bg-ink-heading border border-brass", className)}>
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className={cn(
            "flex-1",
            i < filled
              ? cn(TONE[tone], "shadow-[inset_0_1px_0_rgba(239,228,204,0.3)] motion-safe:animate-seg-in")
              : "bg-parchment/10"
          )}
          style={i < filled ? { animationDelay: `${i * 22}ms` } : undefined}
        />
      ))}
    </div>
  );
}
