"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Tags } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

// Shared URL-param plumbing for both filter pieces below — they're rendered
// as separate blocks on the page (category filter vs. search toolbar) but
// both read/write the same query string, via Next's shared (reactive)
// useSearchParams.
function useGameFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTags = (searchParams.get("tags") ?? "").split(",").filter(Boolean);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag];
    updateParam("tags", next.join(","));
  }

  return { searchParams, selectedTags, updateParam, toggleTag };
}

// Search box, difficulty and "beginner friendly" — the toolbar above the grid.
export function GameSearchToolbar() {
  const { searchParams, updateParam } = useGameFilterParams();

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-leather-light pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar un juego…"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => updateParam("q", e.target.value)}
          className="w-full h-11 pl-9 pr-3 font-body text-sm text-ink bg-parchment/90 border border-border focus:border-brass focus:ring-1 focus:ring-brass/40 outline-none"
        />
      </div>
      <Select
        defaultValue={searchParams.get("complexity") ?? ""}
        onChange={(e) => updateParam("complexity", e.target.value)}
        wrapperClassName="w-44"
      >
        <option value="">Toda dificultad</option>
        <option value="light">Fácil</option>
        <option value="medium">Intermedio</option>
        <option value="heavy">Avanzado</option>
      </Select>
      <label className="flex items-center gap-2 font-body text-sm text-parchment-dark px-2">
        <input
          type="checkbox"
          defaultChecked={searchParams.get("beginner") === "1"}
          onChange={(e) => updateParam("beginner", e.target.checked ? "1" : "")}
          className="accent-moss size-4"
        />
        Ideal para empezar
      </label>
    </div>
  );
}

// Tag list — a single static column sitting above the search toolbar, full
// width of the page. Deliberately NOT sticky/sidebar-positioned: it sits at
// the top once and scrolls away with the rest of the page like any other
// content, instead of following the games grid as you scroll past it.
export function GameCategoryFilter({ allTags }: { allTags: string[] }) {
  const { selectedTags, toggleTag } = useGameFilterParams();

  if (allTags.length === 0) return null;

  return (
    <div className="surface-parchment p-4 mb-8 max-w-xs">
      <p className="flex items-center gap-1.5 font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">
        <Tags size={14} /> Categorías
      </p>
      <div className="flex flex-col gap-2">
        {allTags.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "font-label text-2xs font-semibold uppercase tracking-wide px-2.5 py-1.5 rounded-sm border text-left transition-colors",
                active
                  ? "bg-brass text-ink border-brass"
                  : "bg-transparent text-ink-light border-border hover:border-brass hover:text-brass-bright"
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
