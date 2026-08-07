"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { classes } from "../../data/classes";
import { MAX_CLASSES } from "../../lib/wizardState";

export function ClassPicker({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (classId: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.alsoKnownAs.some((a) => a.toLowerCase().includes(q)) ||
        c.description.toLowerCase().includes(q),
    );
  }, [query]);

  const atCap = selectedIds.length >= MAX_CLASSES;

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search classes…"
        className="w-full max-w-xl rounded-md border border-[var(--fu-border)] bg-[var(--fu-bg-elevated)] p-3 text-base text-[var(--fu-text)] placeholder:text-[var(--fu-text-muted)]/50 focus:border-[var(--fu-gold)] focus:outline-none"
      />
      <div className="fu-scrollbar grid max-h-[28rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-4">
        {filtered.map((cls) => {
          const selected = selectedIds.includes(cls.id);
          const disabled = !selected && atCap;
          return (
            <button
              key={cls.id}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(cls.id)}
              className={cn(
                "fu-panel p-4 text-left transition-colors",
                selected && "border-[var(--fu-gold)] bg-[var(--fu-panel-hover)]",
                !selected && !disabled && "hover:border-[var(--fu-border-bright)]",
                disabled && "opacity-40",
              )}
            >
              <div className="fu-heading text-lg font-semibold text-[var(--fu-text)]">{cls.name}</div>
              <div className="text-sm text-[var(--fu-text-muted)]">{cls.alsoKnownAs.join(" · ")}</div>
              <p className="mt-2 line-clamp-3 text-sm leading-snug text-[var(--fu-text-muted)]">
                {cls.description}
              </p>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-base text-[var(--fu-text-muted)]">
            No classes match &quot;{query}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
