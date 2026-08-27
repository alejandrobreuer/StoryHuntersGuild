"use client";

import * as React from "react";
import { NpcPortrait, NpcDetailModal } from "@/components/rol/npc/NpcDetailModal";
import type { NpcRow } from "@/lib/rol/npc";

// Any NPC whose current (non-"Ex-") faction matches the guild's own name —
// filtered server-side in app/rol/page.tsx, this just renders + the popup.
export function GuildStaffSection({ staff }: { staff: NpcRow[] }) {
  const [selected, setSelected] = React.useState<NpcRow | null>(null);

  if (staff.length === 0) return null;

  return (
    <div className="mb-14">
      <h2 className="font-display text-2xl text-parchment mb-4">Staff del Gremio</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {staff.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setSelected(n)}
            className="surface-parchment p-4 flex items-center gap-3 text-left hover:shadow-parchment-lg transition-shadow"
          >
            <NpcPortrait npc={n} className="size-14 shrink-0 rounded-full border border-brass/30" />
            <div className="min-w-0 flex-1">
              <p className="font-label text-sm font-bold text-ink truncate">{n.name}</p>
              {n.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {n.tags.map((tag) => (
                    <span key={tag} className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/10 text-brass">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && <NpcDetailModal npc={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
