"use client";

import * as React from "react";
import { ScrollText, Lock, Unlock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShgRolGuildFeature, ShgRolGuildStatus } from "@/types/database";

// Collapsed by default — a pull-tab on the hero's right edge with a badge
// for how many features are still locked, so there's a visible cue that
// something's hidden. Opens as a panel that overlays the hero image itself
// (position: absolute within it), not one that pushes the page layout.
export function GuildFeaturesDrawer({ features, statuses }: { features: ShgRolGuildFeature[]; statuses: ShgRolGuildStatus[] }) {
  const [open, setOpen] = React.useState(false);
  const statusById = React.useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);
  const lockedCount = features.filter((f) => !f.unlocked).length;

  return (
    <>
      {open && (
        <div className="absolute inset-0 z-20" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar funciones del gremio" : "Ver funciones del gremio"}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 py-4 px-2",
          "bg-ink/85 border border-brass/40 border-r-0 hover:bg-ink/95 transition-[right] duration-300",
          open ? "right-80" : "right-0"
        )}
      >
        <ScrollText size={16} className="text-brass-light" />
        <span className="font-label text-2xs uppercase tracking-widest text-parchment [writing-mode:vertical-rl]">
          Funciones
        </span>
        {lockedCount > 0 && (
          <span className="font-label text-2xs font-bold size-5 rounded-full bg-crimson text-crimson-foreground flex items-center justify-center shrink-0">
            {lockedCount}
          </span>
        )}
      </button>

      <div
        className={cn(
          "absolute inset-y-0 right-0 z-30 w-80 max-w-[85vw] overflow-y-auto surface-parchment p-5 transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink">Funciones del gremio</h2>
          <button onClick={() => setOpen(false)} aria-label="Cerrar" className="text-leather-light hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        {features.length === 0 ? (
          <p className="font-body italic text-ink-light text-sm">Todavía no hay funciones cargadas.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {features.map((f) => {
              const requiredStatus = f.guild_status_id ? statusById.get(f.guild_status_id) : null;
              return (
                <div key={f.id} className={cn("border border-border bg-parchment/40 p-3", !f.unlocked && "opacity-70")}>
                  <div className="flex items-center gap-2 mb-1">
                    {f.unlocked ? <Unlock size={14} className="text-moss shrink-0" /> : <Lock size={14} className="text-leather-light shrink-0" />}
                    <p className="font-label text-sm font-bold text-ink">{f.title}</p>
                  </div>
                  <p className="font-body text-xs text-ink-light">{f.description}</p>
                  {f.benefit && <p className="font-body text-xs text-brass mt-1.5">{f.benefit}</p>}
                  {(f.cost_supplies > 0 || requiredStatus) && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {f.cost_supplies > 0 && (
                        <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                          {f.supplies_allocated}/{f.cost_supplies} suministros
                        </span>
                      )}
                      {requiredStatus && (
                        <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-moss/10 text-moss-dark">
                          Requiere: {requiredStatus.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
