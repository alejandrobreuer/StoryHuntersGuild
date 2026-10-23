"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, Search, Tags } from "lucide-react";
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

// Filter sidebar, laid out as a left-hand column next to the games grid; for
// now its only (collapsible) section is the tag list, more filters will join it.
// lg:top-[195px] pins it below the nav and the pinned page header (see
// app/games/page.tsx), the same spot it occupies before scrolling, so it
// never moves. On lg it has a fixed height (the visible area minus a 24px
// gap at the bottom) whatever its content, and scrolls its content itself
// when the open sections don't fit.
export function GameTagSidebar({ allTags }: { allTags: string[] }) {
  const { selectedTags, toggleTag } = useGameFilterParams();
  const asideRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

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

  if (allTags.length === 0) return null;

  return (
    <div className="lg:self-stretch lg:-mb-[100vh]">
      {/* scrollbar-gutter: the scrollbar's space is always reserved, so the
          content (e.g. the section's arrow) doesn't shift when it appears. */}
      <aside ref={asideRef} className="surface-parchment p-4 lg:sticky lg:top-[195px] lg:z-30 lg:h-[calc(100vh-219px)] lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="game-tag-list"
          className={cn(
            "flex w-full items-center gap-1.5 font-label text-sm font-bold uppercase tracking-widest text-ink hover:text-brass-bright transition-colors",
            open && "mb-3"
          )}
        >
          <Tags size={14} /> Categorías
          {/* How many are selected — mostly for when it's collapsed. */}
          {selectedTags.length > 0 && (
            <span className="font-label text-2xs tracking-wide px-1.5 rounded-sm bg-brass text-ink">
              {selectedTags.length}
            </span>
          )}
          <ChevronDown size={16} className={cn("ml-auto transition-transform", open && "rotate-180")} />
        </button>
        {/* !hidden: plain `hidden` (or the hidden attribute) loses to `flex`. */}
        <div id="game-tag-list" className={cn("flex flex-wrap gap-x-4 gap-y-2 lg:flex-col", !open && "!hidden")}>
          {allTags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <label
                key={tag}
                className={cn(
                  "flex items-center gap-2 cursor-pointer font-label text-xs font-semibold uppercase tracking-wide transition-colors hover:text-brass-bright",
                  active ? "text-ink" : "text-ink-light"
                )}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleTag(tag)}
                  className="accent-moss size-4 shrink-0"
                />
                {tag}
              </label>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
