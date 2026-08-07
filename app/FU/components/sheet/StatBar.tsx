export function StatBar({
  label,
  value,
  max,
  colorVar = "--fu-gold",
  markerAt,
}: {
  label: string;
  value: number;
  max: number;
  colorVar?: string;
  markerAt?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="fu-label flex justify-between text-[10px] text-[var(--fu-text-muted)]">
        <span>{label}</span>
        <span>
          {value} / {max}
        </span>
      </div>
      <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-[var(--fu-bg-elevated)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `var(${colorVar})` }}
        />
        {markerAt != null && max > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-[var(--fu-danger)]"
            style={{ left: `${Math.min(100, (markerAt / max) * 100)}%` }}
            title={`Crisis at ${markerAt}`}
          />
        )}
      </div>
    </div>
  );
}
