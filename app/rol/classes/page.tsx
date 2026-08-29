"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ReferenceDataProvider, useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import type { FUClass } from "@/app/FU/data/types";

/**
 * A vertical strip per class (horizontal strip on mobile) — click one and it
 * expands (flex-grow) while the rest collapse back to a thin labeled strip,
 * matching the "choose your class" selector the user handed over as
 * Images/Classes/class-selector.html. Not the site's usual parchment look on
 * purpose — this is a full-bleed, dark "character select" screen.
 */
function ClassPanel({ cls, active, onSelect }: { cls: FUClass; active: boolean; onSelect: () => void }) {
  const [imgError, setImgError] = React.useState(false);
  const chips = [...cls.skills, ...(cls.subsystem?.entries ?? [])];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-expanded={active}
      className={cn(
        "group relative overflow-hidden border-b border-r border-black/50 text-left last:border-b-0 last:border-r-0",
        "min-h-[60px] transition-[flex] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] md:min-h-0 md:min-w-20",
        active ? "flex-[6]" : "flex-1"
      )}
    >
      {imgError ? (
        <div className="absolute inset-0 bg-gradient-to-br from-[#3a2a1c] to-[#5c3d24]" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- static reference asset (public/images/classes), covers its own panel
        <img
          src={`/images/classes/${cls.id}.webp`}
          alt=""
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      )}

      {/* darken the art so text stays legible, more so near the bottom where the content sits */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/55" />

      {/* collapsed label — vertical strip text on desktop, horizontal on the mobile (stacked) layout */}
      <span
        className={cn(
          "pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 rotate-180 whitespace-nowrap font-label text-sm uppercase tracking-[0.2em] text-brass-bright transition-opacity duration-300 [writing-mode:vertical-rl] md:block",
          active && "opacity-0"
        )}
      >
        {cls.name}
      </span>
      <span
        className={cn(
          "pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap font-label text-sm uppercase tracking-[0.15em] text-brass-bright transition-opacity duration-300 md:hidden",
          active && "opacity-0"
        )}
      >
        {cls.name}
      </span>

      {/* expanded content */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-6 transition-all duration-400 md:p-8",
          active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        )}
      >
        <h2 className="mb-2 font-display text-2xl uppercase tracking-wide text-brass-bright">{cls.name}</h2>
        <p className="mb-4 max-w-xl font-body text-sm leading-relaxed text-parchment-dark">{cls.description}</p>
        <ul className="flex max-w-2xl flex-wrap gap-2">
          {chips.map((c) => (
            <li
              key={c.name}
              className="rounded-sm border border-brass/70 bg-brass/10 px-3 py-1 font-label text-2xs uppercase tracking-wide text-brass-bright"
            >
              {c.name}
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

function ClassSelector() {
  const ref = useReferenceDataContext();
  const [activeId, setActiveId] = React.useState<string | null>(ref.classes[0]?.id ?? null);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden md:flex-row">
      {ref.classes.map((cls) => (
        <ClassPanel key={cls.id} cls={cls} active={cls.id === activeId} onSelect={() => setActiveId(cls.id)} />
      ))}
    </div>
  );
}

export default function RolClassesPage() {
  return (
    <main className="flex h-[calc(100vh-60px)] flex-col bg-[#14100c]">
      <h1 className="shrink-0 py-4 text-center font-display text-lg uppercase tracking-[0.3em] text-brass-bright">
        Elegí tu Clase
      </h1>
      <ReferenceDataProvider>
        <ClassSelector />
      </ReferenceDataProvider>
    </main>
  );
}
