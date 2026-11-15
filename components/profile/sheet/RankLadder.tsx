"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ShgRank } from "@/types/database";

/** Every rank in order, with the RP each step costs. Tapping a rank shows its
 * crest, RP total and description below (what the old rank strip's modal
 * showed). Starts on the next rank, or the current one at the top. */
export function RankLadder({ ranks, rp }: { ranks: ShgRank[]; rp: number }) {
  const sorted = React.useMemo(() => [...ranks].sort((a, b) => a.rp_required - b.rp_required), [ranks]);
  const currentIdx = sorted.reduce((acc, r, i) => (rp >= r.rp_required ? i : acc), -1);
  const [selectedId, setSelectedId] = React.useState(sorted[currentIdx + 1]?.id ?? sorted[currentIdx]?.id ?? null);
  const selected = sorted.find((r) => r.id === selectedId) ?? null;

  return (
    <>
      <div className="bg-brass/10 border border-parchment-deep px-3.5 py-4 overflow-x-auto">
        <div className="flex items-start" style={{ minWidth: sorted.length * 84 }}>
          {sorted.map((r, i) => {
            const now = i === currentIdx;
            const past = i < currentIdx;
            const next = sorted[i + 1];
            return (
              <div key={r.id} className={cn("flex items-start", next ? "flex-1" : "flex-none")}>
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  aria-pressed={r.id === selectedId}
                  className="flex flex-col items-center gap-1.5 w-[76px] shrink-0 group"
                >
                  <span className={cn(
                    "relative size-11 rounded-full flex items-center justify-center font-display font-bold text-base overflow-hidden",
                    now && "bg-crimson text-parchment border-2 border-brass-light shadow-[0_0_0_3px_rgba(122,32,32,0.25)]",
                    past && "bg-gradient-to-br from-brass-light to-brass text-ink-heading border-2 border-brass-dark",
                    !now && !past && "text-ink-light border-[1.5px] border-dashed border-brass",
                    r.id === selectedId && "outline outline-2 outline-offset-2 outline-brass-dark"
                  )}>
                    {r.icon_url ? (
                      <Image src={r.icon_url} alt="" fill className={cn("object-contain p-1", !now && !past && "opacity-50")} sizes="44px" />
                    ) : (
                      r.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className={cn(
                    "font-display text-[10px] uppercase tracking-wider font-semibold text-center leading-tight",
                    now ? "text-crimson" : "text-ink-light group-hover:text-ink"
                  )}>
                    {r.name}
                  </span>
                </button>
                {next && (
                  <div className="flex-1 flex flex-col items-center pt-2.5 min-w-0">
                    <div className={cn("w-full h-px", i < currentIdx ? "bg-brass" : "bg-parchment-deep")} />
                    <span className="font-body text-xs text-ink-light mt-0.5 whitespace-nowrap">+{next.rp_required - r.rp_required} RP</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="flex gap-3 items-start px-3.5 py-3 border border-parchment-deep bg-white/40">
          <div className="relative size-12 shrink-0 flex items-center justify-center">
            {selected.icon_url ? (
              <Image src={selected.icon_url} alt="" fill className="object-contain" sizes="48px" />
            ) : (
              <span className="font-display font-bold text-2xl text-crimson">{selected.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-body font-semibold text-lg text-ink-heading leading-tight">{selected.name}</p>
            <p className="font-display text-[11px] uppercase tracking-wider text-brass-dark mt-0.5">{selected.rp_required} RP necesarios</p>
            {selected.benefit ? (
              <p className="font-body text-sm text-ink mt-1 leading-relaxed">{selected.benefit}</p>
            ) : (
              <p className="font-body text-sm italic text-ink-light mt-1">Este rango todavía no tiene una descripción cargada.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
