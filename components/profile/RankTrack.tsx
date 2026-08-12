"use client";

import * as React from "react";
import Image from "next/image";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import type { ShgRank } from "@/types/database";

interface RankTrackProps {
  ranks: ShgRank[];
  rp: number;
}

// The horizontal rank-progression strip on the profile page: each rank is
// clickable (opens a modal with its crest, name, and benefit), and the gap
// between two ranks shows the RP needed to cross it.
export function RankTrack({ ranks, rp }: RankTrackProps) {
  const [selected, setSelected] = React.useState<ShgRank | null>(null);
  const sorted = React.useMemo(() => [...ranks].sort((a, b) => a.rp_required - b.rp_required), [ranks]);

  return (
    <>
      <div className="flex items-start gap-1 overflow-x-auto">
        {sorted.map((r, i) => {
          const achieved = rp >= r.rp_required;
          const next = sorted[i + 1];
          const gap = next ? next.rp_required - r.rp_required : null;
          return (
            <React.Fragment key={r.id}>
              <button
                type="button"
                onClick={() => setSelected(r)}
                className={cn(
                  "flex flex-col items-center shrink-0 min-w-[64px] py-1 transition-opacity hover:opacity-80",
                  !achieved && "opacity-40"
                )}
              >
                <div className="relative size-10 flex items-center justify-center">
                  {r.icon_url ? (
                    <Image src={r.icon_url} alt="" fill className="object-contain" sizes="40px" />
                  ) : (
                    <Shield size={26} className="text-brass" />
                  )}
                </div>
                <span className="font-label text-2xs tracking-wide text-leather-light mt-1 uppercase text-center leading-tight">
                  {r.name}
                </span>
              </button>
              {next && (
                <div className="flex items-center justify-center shrink-0 px-0.5 self-center pt-1">
                  <span className="font-label text-[10px] text-leather-light/70 whitespace-nowrap">+{gap} RP</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name ?? ""} className="max-w-sm">
        {selected && (
          <div className="text-center">
            <div className="relative size-24 mx-auto mb-3 flex items-center justify-center">
              {selected.icon_url ? (
                <Image src={selected.icon_url} alt="" fill className="object-contain" sizes="96px" />
              ) : (
                <Shield size={56} className="text-crimson" strokeWidth={1.25} />
              )}
            </div>
            <p className="font-label text-2xs uppercase tracking-widest text-brass mb-3">
              {selected.rp_required} RP necesarios
            </p>
            {selected.benefit ? (
              <p className="font-body text-sm text-ink-light leading-relaxed">{selected.benefit}</p>
            ) : (
              <p className="font-body text-sm italic text-ink-light/70">Este rango todavía no tiene una descripción cargada.</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
