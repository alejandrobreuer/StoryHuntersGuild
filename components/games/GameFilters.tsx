"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Tags } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

// Shared URL-param plumbing for both filter pieces below — they're rendered
// in different parts of the page layout (sidebar vs. toolbar) but both read/
// write the same query string, via Next's shared (reactive) useSearchParams.
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

// Tag list, laid out as a single left-hand column (a filter sidebar) rather
// than a row of wrapping pills.
export function GameTagSidebar({ allTags }: { allTags: string[] }) {
  const { selectedTags, toggleTag } = useGameFilterParams();

  if (allTags.length === 0) return null;

  return (
    // lg:top-[72px] clears the sticky nav (Nav.tsx, ~59px tall) with a
    // small gap; max-h caps the box at that same offset from both viewport
    // edges so it can NEVER be taller than the visible area. Without that
    // cap, a sticky element taller than the viewport scrolls along with the
    // page (its natural, if surprising, sticky behavior) until its bottom
    // edge comes into view before it "catches" — which reads as the
    // sidebar randomly refusing to stay put until you scroll past the
    // whole tag list. Capping the height instead makes the tag list itself
    // (not the sidebar) the thing that scrolls once it doesn't fit.
    <aside className="surface-parchment p-4 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-96px)] shrink-0 flex flex-col">
      <p className="flex items-center gap-1.5 font-label text-sm font-bold uppercase tracking-widest text-ink mb-3 shrink-0">
        <Tags size={14} /> Categorías
      </p>
      <div className="flex flex-wrap lg:flex-col gap-2 lg:overflow-y-auto lg:min-h-0 lg:pr-1">
        {allTags.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "font-label text-2xs font-semibold uppercase tracking-wide px-2.5 py-1.5 rounded-sm border transition-colors lg:text-left",
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
    </aside>
  );
}
