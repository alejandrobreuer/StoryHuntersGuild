"use client";

import * as React from "react";
import Image from "next/image";
import { Users, Clock, Dice5, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GameCard, COMPLEXITY_LABEL, complexityBadgeClass } from "@/components/games/GameCard";
import { formatPlayers, formatPlaytime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { ShgGame } from "@/types/database";

export function GameGrid({ games }: { games: ShgGame[] }) {
  const [selected, setSelected] = React.useState<ShgGame | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {games.map((g) => (
          <GameCard key={g.id} game={g} onClick={() => setSelected(g)} />
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""} className="max-w-lg">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="relative w-full aspect-square bg-parchment-dark/40 border border-brass/30 flex items-center justify-center overflow-hidden">
              {selected.image_url ? (
                <Image src={selected.image_url} alt={selected.name} fill className="object-contain" sizes="480px" />
              ) : (
                <Dice5 size={56} className="text-leather-light" />
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-leather-light">
              <span className="flex items-center gap-1.5"><Users size={13} />{formatPlayers(selected.min_players, selected.max_players)}</span>
              <span className="flex items-center gap-1.5"><Clock size={13} />{formatPlaytime(selected.playtime_minutes)}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className={cn(
                "font-label text-2xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm",
                complexityBadgeClass(selected.complexity)
              )}>
                {COMPLEXITY_LABEL[selected.complexity]}
              </span>
              {selected.beginner_friendly && (
                <span className="font-label text-2xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm bg-moss/15 text-moss-dark">
                  Para empezar
                </span>
              )}
              {!selected.available && (
                <span className="font-label text-2xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm bg-crimson/15 text-crimson">
                  No disponible
                </span>
              )}
              {selected.tags.map((tag) => (
                <span key={tag} className="font-label text-2xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm bg-leather/10 text-leather">
                  {tag}
                </span>
              ))}
            </div>

            {selected.description && (
              <p className="font-body text-sm text-ink-light leading-relaxed">{selected.description}</p>
            )}

            {selected.bgg_link && (
              <a
                href={selected.bgg_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-label text-xs font-semibold uppercase tracking-widest text-brass hover:text-brass-bright transition-colors w-fit"
              >
                Ver en BoardGameGeek <ExternalLink size={13} />
              </a>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
