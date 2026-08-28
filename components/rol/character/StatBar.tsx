const COLOR_CLASSES: Record<string, string> = {
  moss: "bg-moss",
  brass: "bg-brass",
  crimson: "bg-crimson",
  blue: "bg-blue-500",
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
  color?: "moss" | "brass" | "crimson" | "blue";
  markerAt?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="relative h-7 flex-1 overflow-hidden rounded-full border border-border/60 bg-parchment-dark/40">
      <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${COLOR_CLASSES[color]}`} style={{ width: `${pct}%` }} />
      {markerAt != null && max > 0 && (
        <div className="absolute top-0 h-full w-0.5 bg-crimson" style={{ left: `${Math.min(100, (markerAt / max) * 100)}%` }} title={`Crisis en ${markerAt}`} />
      )}
      <div className="relative flex h-full items-center justify-between px-3">
        <span className="font-label text-2xs font-bold uppercase tracking-wide text-parchment drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">{label}</span>
        <span className="font-label text-xs font-bold text-parchment drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">{value} / {max}</span>
      </div>
    </div>
  );
}
