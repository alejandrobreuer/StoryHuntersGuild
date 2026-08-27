"use client";

import * as React from "react";
import { User, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Same collapsible-drawer mechanics as components/rol/GuildFeaturesDrawer,
// mirrored to the left edge and viewport-fixed (the sheet is a normal-flow
// page, not a fixed-height hero, so this can't be absolutely positioned
// within a container the way the guild one is) — closed by default, never
// permanently eats sheet width per character-sheet-logic-spec.md.
export function CharacterFullBodyDrawer({ imageUrl }: { imageUrl: string | null }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar imagen de cuerpo completo" : "Ver imagen de cuerpo completo"}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 py-4 px-2",
          "bg-ink/85 border border-brass/40 border-l-0 hover:bg-ink/95 transition-[left] duration-300",
          open ? "left-72" : "left-0"
        )}
      >
        <User size={16} className="text-brass-light" />
        <span className="font-label text-2xs uppercase tracking-widest text-parchment [writing-mode:vertical-rl] rotate-180">
          Cuerpo completo
        </span>
      </button>

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto surface-parchment p-4 transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink">Cuerpo completo</h2>
          <button onClick={() => setOpen(false)} aria-label="Cerrar" className="text-leather-light hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
          <img src={imageUrl} alt="" className="w-full h-auto" />
        ) : (
          <div className="aspect-[3/4] flex items-center justify-center bg-parchment-dark/30">
            <User size={40} className="text-leather-light" />
          </div>
        )}
      </div>
    </>
  );
}
