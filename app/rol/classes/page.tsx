"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ReferenceDataProvider, useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import type { FUClass } from "@/app/FU/data/types";

// Must match the panel's own transition-[flex] duration below — the
// description is held back until the width transition has actually finished,
// instead of fading in while the panel is still visibly resizing.
const PANEL_EXPAND_MS = 500;

/**
 * A vertical strip per class (horizontal strip on mobile) — click one and it
 * expands (flex-grow) while the rest collapse back to a thin labeled strip,
 * matching the "choose your class" selector the user handed over as
 * Images/Classes/class-selector.html. Not the site's usual parchment look on
 * purpose — this is a full-bleed, dark "character select" screen.
 */
function ClassPanel({
  cls, active, contentReady, onSelect,
}: {
  cls: FUClass; active: boolean; contentReady: boolean; onSelect: () => void;
}) {
  const [imgError, setImgError] = React.useState(false);

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

      {/* expanded content — only mounted once the panel has actually finished expanding */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-6 transition-opacity duration-200 md:p-8",
          contentReady ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {contentReady && (
          <>
            <h2 className="mb-2 font-display text-2xl uppercase tracking-wide text-brass-bright">{cls.name}</h2>
            <p className="max-w-xl font-body text-sm leading-relaxed text-parchment-dark">{cls.description}</p>
          </>
        )}
      </div>
    </button>
  );
}

function ClassSelector() {
  const ref = useReferenceDataContext();
  const firstId = ref.classes[0]?.id ?? null;
  const [activeId, setActiveId] = React.useState<string | null>(firstId);
  // The class whose description is actually allowed to show — starts equal
  // to the initial active panel (no delay needed, it's not "expanding" from
  // anything on first load) and only lags behind activeId on later clicks.
  const [contentReadyId, setContentReadyId] = React.useState<string | null>(firstId);
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setContentReadyId(null);
    if (!activeId) return;
    const timer = setTimeout(() => setContentReadyId(activeId), PANEL_EXPAND_MS);
    return () => clearTimeout(timer);
  }, [activeId]);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden md:flex-row">
      {ref.classes.map((cls) => (
        <ClassPanel
          key={cls.id}
          cls={cls}
          active={cls.id === activeId}
          contentReady={cls.id === activeId && cls.id === contentReadyId}
          onSelect={() => setActiveId(cls.id)}
        />
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
