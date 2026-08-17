const COLOR_CLASSES: Record<string, string> = {
  moss: "bg-moss",
  brass: "bg-brass",
  crimson: "bg-crimson",
};

export function StatBar({
  label,
  value,
  max,
  color = "brass",
  markerAt,
}: {
  label: string;
  value: number;
  max: number;
  color?: "moss" | "brass" | "crimson";
  markerAt?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="font-label flex justify-between text-xs uppercase tracking-wide text-ink-light">
        <span>{label}</span>
        <span>{value} / {max}</span>
      </div>
      <div className="relative mt-1.5 h-3.5 overflow-hidden rounded-full bg-parchment-dark/40">
        <div className={`h-full rounded-full transition-all duration-500 ${COLOR_CLASSES[color]}`} style={{ width: `${pct}%` }} />
        {markerAt != null && max > 0 && (
          <div className="absolute top-0 h-full w-0.5 bg-crimson" style={{ left: `${Math.min(100, (markerAt / max) * 100)}%` }} title={`Crisis en ${markerAt}`} />
        )}
      </div>
    </div>
  );
}
