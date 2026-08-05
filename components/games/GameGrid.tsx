"use client";

import * as React from "react";
import Image from "next/image";
import { Users, Clock, Dice5, ExternalLink, BookOpen, ArrowLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GameCard, COMPLEXITY_LABEL, complexityBadgeClass } from "@/components/games/GameCard";
import { RulesContent } from "@/components/games/RulesContent";
import { parseRulesMarkup } from "@/lib/rules-markup";
import { formatPlayers, formatPlaytime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { ShgGame } from "@/types/database";

export function GameGrid({ games }: { games: ShgGame[] }) {
  const [selected, setSelected] = React.useState<ShgGame | null>(null);
  const [showRules, setShowRules] = React.useState(false);
  const hasRules = !!selected?.rules && selected.rules.trim().length > 0;

  function openGame(g: ShgGame) {
    setSelected(g);
    setShowRules(false);
  }

  function closeModal() {
    setSelected(null);
    setShowRules(false);
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {games.map((g) => (
          <GameCard key={g.id} game={g} onClick={() => openGame(g)} />
        ))}
      </div>

      <Modal
        open={!!selected}
        onClose={closeModal}
        title={selected ? (showRules ? `${selected.name} — Reglas` : selected.name) : ""}
        className="max-w-2xl p-9"
        titleClassName="text-2xl"
      >
        {selected && showRules && (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setShowRules(false)}
              className="inline-flex items-center gap-1.5 font-label text-xs font-semibold uppercase tracking-widest text-brass hover:text-brass-bright transition-colors w-fit"
            >
              <ArrowLeft size={15} /> Volver a la ficha
            </button>
            <RulesContent blocks={parseRulesMarkup(selected.rules ?? "")} />
          </div>
        )}

        {selected && !showRules && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-5">
              <div className="relative size-36 shrink-0 bg-parchment-dark/40 border border-brass/30 flex items-center justify-center overflow-hidden">
                {selected.image_url ? (
                  <Image src={selected.image_url} alt={selected.name} fill className="object-contain" sizes="144px" />
                ) : (
                  <Dice5 size={44} className="text-leather-light" />
                )}
              </div>

              <div className="flex flex-col gap-3 min-w-0">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-leather-light">
                  <span className="flex items-center gap-1.5"><Users size={16} />{formatPlayers(selected.min_players, selected.max_players)}</span>
                  <span className="flex items-center gap-1.5"><Clock size={16} />{formatPlaytime(selected.playtime_minutes)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={cn(
                    "font-label text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-sm",
                    complexityBadgeClass(selected.complexity)
                  )}>
                    {COMPLEXITY_LABEL[selected.complexity]}
                  </span>
                  {selected.beginner_friendly && (
                    <span className="font-label text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-sm bg-moss/15 text-moss-dark">
                      Para empezar
                    </span>
                  )}
                  {!selected.available && (
                    <span className="font-label text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-sm bg-crimson/15 text-crimson">
                      No disponible
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selected.tags.length > 0 && (
              <div>
                <h3 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="font-label text-sm font-bold uppercase tracking-wide px-3 py-1 rounded-sm bg-leather/10 text-leather">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selected.description && (
              <div>
                <h3 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-2">Descripción</h3>
                <p className="font-body text-lg text-ink leading-relaxed">{selected.description}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              {hasRules && (
                <button
                  type="button"
                  onClick={() => setShowRules(true)}
                  className="inline-flex items-center gap-1.5 font-label text-sm font-semibold uppercase tracking-widest text-brass hover:text-brass-bright transition-colors w-fit"
                >
                  <BookOpen size={15} /> Reglas
                </button>
              )}
              {selected.bgg_link && (
                <a
                  href={selected.bgg_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-label text-sm font-semibold uppercase tracking-widest text-brass hover:text-brass-bright transition-colors w-fit"
                >
                  Ver en BoardGameGeek <ExternalLink size={15} />
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
