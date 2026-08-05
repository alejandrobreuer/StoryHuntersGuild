import Image from "next/image";
import { Users, Clock, Dice5 } from "lucide-react";
import { formatPlayers, formatPlaytime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { ShgGame } from "@/types/database";

export const COMPLEXITY_LABEL: Record<string, string> = { light: "Fácil", medium: "Intermedio", heavy: "Avanzado" };

export function complexityBadgeClass(complexity: string): string {
  return complexity === "light" ? "bg-moss/15 text-moss-dark" : complexity === "heavy" ? "bg-crimson/15 text-crimson" : "bg-brass/15 text-brass";
}

export function GameCard({ game, onClick }: { game: ShgGame; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="surface-parchment border-t-4 border-t-moss p-5 text-left w-full transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="relative w-full aspect-square mb-3 bg-parchment-dark/40 border border-brass/30 flex items-center justify-center overflow-hidden">
        {game.image_url ? (
          <Image src={game.image_url} alt={game.name} fill className="object-contain" sizes="220px" />
        ) : (
          <Dice5 size={40} className="text-leather-light" />
        )}
      </div>
      <h3 className="font-label text-sm font-bold text-ink mb-1">{game.name}</h3>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-leather-light mb-2">
        <span className="flex items-center gap-1"><Users size={11} />{formatPlayers(game.min_players, game.max_players)}</span>
        <span className="flex items-center gap-1"><Clock size={11} />{formatPlaytime(game.playtime_minutes)}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className={cn(
          "font-label text-2xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm",
          complexityBadgeClass(game.complexity)
        )}>
          {COMPLEXITY_LABEL[game.complexity]}
        </span>
        {game.beginner_friendly && (
          <span className="font-label text-2xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm bg-moss/15 text-moss-dark">
            Para empezar
          </span>
        )}
        {!game.available && (
          <span className="font-label text-2xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm bg-crimson/15 text-crimson">
            No disponible
          </span>
        )}
      </div>
      {game.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {game.tags.map((tag) => (
            <span key={tag} className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-leather/10 text-leather">
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
