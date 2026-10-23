"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, Clock, Gauge, PackageCheck, Search, SlidersHorizontal, Sprout, Tags, Users, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COMPLEXITY_OPTIONS,
  PLAYER_OPTIONS,
  PLAYTIME_OPTIONS,
  STATUS_OPTIONS,
  parseListParam,
  type FilterOption,
} from "@/lib/games/filters";

// Shared URL-param plumbing for both filter pieces below — they're rendered
// in different parts of the page layout (sidebar vs. toolbar) but both read/
// write the same query string, via Next's shared (reactive) useSearchParams.
function useGameFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function getList(key: string) {
    return parseListParam(searchParams.get(key) ?? undefined);
  }

  function toggleInList(key: string, value: string) {
    const current = getList(key);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    updateParam(key, next.join(","));
  }

  function clearParams(keys: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  return { searchParams, updateParam, getList, toggleInList, clearParams };
}

// Search box — the toolbar above the grid.
export function GameSearchToolbar() {
  const { searchParams, updateParam } = useGameFilterParams();

  return (
    // Pinned on lg right under the page header (see app/games/page.tsx); pb
    // instead of mb so its opaque background hides the cards scrolling under it,
    // widened sideways (like the header) to also cover their glow; the sidebar
    // sits above it (z-30) so it isn't covered in turn.
    <div className="flex flex-wrap gap-3 pb-8 lg:pb-5 lg:sticky lg:top-[195px] lg:z-20 bg-background lg:shadow-[0_0_0_100vmax_#3d3830] lg:[clip-path:inset(0_-100vmax)]">
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
    </div>
  );
}

function FilterSection({
  id,
  title,
  icon: Icon,
  options,
  selected,
  onToggle,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  options: readonly FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const listId = `game-filter-${id}`;

  return (
    <section className="border-t border-border/60 pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "flex w-full items-center gap-1.5 font-label text-sm font-bold uppercase tracking-widest text-ink hover:text-brass-bright transition-colors",
          open && "mb-3"
        )}
      >
        <Icon size={14} /> {title}
        {selected.length > 0 && (
          <span className="font-label text-2xs tracking-wide px-1.5 rounded-sm bg-brass text-ink">
            {selected.length}
          </span>
        )}
        <ChevronDown size={16} className={cn("ml-auto transition-transform", open && "rotate-180")} />
      </button>
      <div id={listId} className={cn("flex flex-wrap gap-x-4 gap-y-2 lg:flex-col", !open && "!hidden")}>
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-2 cursor-pointer font-label text-xs font-semibold uppercase tracking-wide transition-colors hover:text-brass-bright",
                active ? "text-ink" : "text-ink-light"
              )}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => onToggle(option.value)}
                className="accent-moss size-4 shrink-0"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </section>
  );
}

// Filter sidebar, laid out as a left-hand column next to the games grid, made
// of collapsible sections (see FilterSection and lib/games/filters.ts).
// lg:top-[195px] pins it below the nav and the pinned page header (see
// app/games/page.tsx), the same spot it occupies before scrolling, so it
// never moves. On lg it has a fixed height (the visible area minus a 24px
// gap at the bottom) whatever its content, and scrolls its content itself
// when the open sections don't fit.
export function GameFilterSidebar({ allTags }: { allTags: string[] }) {
  const { getList, toggleInList, clearParams } = useGameFilterParams();
  const asideRef = useRef<HTMLElement>(null);

  // Near the bottom of the page the grid ends, and a sticky element gets pushed
  // up by the end of its containing block — over the search bar. So the sticky
  // sits in a wrapper stretched 100vh past the grid (never pushes), and this
  // ends it at the grid's content edge so it shrinks in place instead.
  // Scroll handlers run a frame behind the compositor; during that frame the
  // grid's overflow-y clip (see app/games/page.tsx) hides the overshoot.
  useEffect(() => {
    const el = asideRef.current;
    const grid = el?.parentElement?.parentElement;
    if (!el || !grid) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    function fit() {
      if (!el || !grid) return;
      const top = parseFloat(getComputedStyle(el).top);
      const gridBottom = grid.getBoundingClientRect().bottom - parseFloat(getComputedStyle(grid).paddingBottom);
      const bottom = Math.min(window.innerHeight - 24, gridBottom);
      el.style.height = desktop.matches ? `${bottom - top}px` : "";
    }
    fit();
    window.addEventListener("scroll", fit, { passive: true });
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
    };
  }, []);

  const sections: [string, string, LucideIcon, readonly FilterOption[]][] = [
    ["tags",       "Categorías",     Tags,         allTags.map((t) => ({ value: t, label: t }))],
    ["players",    "Jugadores",      Users,        PLAYER_OPTIONS],
    ["time",       "Duración",       Clock,        PLAYTIME_OPTIONS],
    ["complexity", "Dificultad",     Gauge,        COMPLEXITY_OPTIONS],
    ["beginner",   "Para empezar",   Sprout,       [{ value: "1", label: "Ideal para empezar" }]],
    ["status",     "Disponibilidad", PackageCheck, STATUS_OPTIONS],
  ];
  const activeCount = sections.reduce((n, [param]) => n + getList(param).length, 0);

  return (
    <div className="lg:self-stretch lg:-mb-[100vh]">
      <aside ref={asideRef} className="surface-parchment p-4 flex flex-col lg:sticky lg:top-[195px] lg:z-30 lg:h-[calc(100vh-219px)]">
        {/* Stays put above the scrolling sections. Clears the sidebar's filters
            only, not the search box. overflow-hidden + scrollbar-gutter reserves
            the same scrollbar space as the list below, so "Limpiar" lines up
            with the sections' arrows. */}
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border shrink-0 lg:overflow-hidden lg:[scrollbar-gutter:stable]">
          <SlidersHorizontal size={14} className="text-ink" />
          <span className="font-label text-sm font-bold uppercase tracking-widest text-ink">Filtros</span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => clearParams(sections.map(([param]) => param))}
              className="ml-auto flex items-center gap-1 font-label text-xs font-semibold uppercase tracking-wide text-ink-light hover:text-brass-bright transition-colors"
            >
              <X size={12} /> Limpiar ({activeCount})
            </button>
          )}
        </div>
        {/* scrollbar-gutter: the scrollbar's space is always reserved, so the
            content (e.g. the sections' arrows) doesn't shift when it appears. */}
        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
          {sections
            .filter(([, , , options]) => options.length > 0)
            .map(([param, title, icon, options]) => (
              <FilterSection
                key={param}
                id={param}
                title={title}
                icon={icon}
                options={options}
                selected={getList(param)}
                onToggle={(value) => toggleInList(param, value)}
              />
            ))}
        </div>
      </aside>
    </div>
  );
}
