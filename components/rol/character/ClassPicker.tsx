"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_CLASSES } from "@/app/FU/lib/wizardState";
import { useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";

export function ClassPicker({ selectedIds, onToggle }: { selectedIds: string[]; onToggle: (classId: string) => void }) {
  const { classes } = useReferenceDataContext();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.alsoKnownAs.some((a) => a.toLowerCase().includes(q)) ||
        c.description.toLowerCase().includes(q)
    );
  }, [query, classes]);

  const atCap = selectedIds.length >= MAX_CLASSES;

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar clases…"
        className="w-full max-w-xl border border-border bg-parchment/60 p-3 text-sm text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body"
      />
      <div className="grid max-h-[28rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-4">
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
                "surface-parchment relative p-4 text-left transition-colors",
                selected && "border-2 border-brass bg-brass/20",
                !selected && !disabled && "hover:border-brass",
                disabled && "opacity-40"
              )}
            >
              {selected && (
                <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-brass text-parchment">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <div className="font-display text-base font-semibold text-ink pr-5">{cls.name}</div>
              <div className="text-xs text-ink-light font-body">{cls.alsoKnownAs.join(" · ")}</div>
              <p className="mt-2 line-clamp-3 text-xs leading-snug text-ink-light font-body">{cls.description}</p>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-ink-light font-body">
            No hay clases que coincidan con &quot;{query}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
