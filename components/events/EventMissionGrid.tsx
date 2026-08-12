"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Dice5, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS } from "@/lib/gamification/questDifficulty";
import type { QuestDifficulty } from "@/types/database";

export type MissionActivationState = "available" | "active" | "turned_in" | "completed";

export interface MissionItem {
  id:          string;
  title:       string;
  narrative:   string | null;
  difficulty:  QuestDifficulty;
  rewardXp:    number;
  rewardRp:    number;
  badgeName:   string | null;
  game:        { name: string; image_url: string | null } | null;
  maxPerEvent: number;
  usedCount:   number;
  initialState: MissionActivationState;
}

interface EventMissionGridProps {
  eventId:  string;
  missions: MissionItem[];
  loggedIn: boolean;
  /** Whether the event is currently live — activate/turn-in only work while it is. */
  isLive:   boolean;
  /** Shown instead of an action button for non-completed missions when isLive is false. */
  inactiveNote: string;
}

export function EventMissionGrid({ eventId, missions, loggedIn, isLive, inactiveNote }: EventMissionGridProps) {
  const [states, setStates] = React.useState<Record<string, MissionActivationState>>(
    () => Object.fromEntries(missions.map((m) => [m.id, m.initialState]))
  );
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function activate(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/quests/${id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo activar la misión."); return; }
      setStates((prev) => ({ ...prev, [id]: "active" }));
      toast.success("Misión activada — ¡a jugar!");
    } finally {
      setBusyId(null);
    }
  }

  async function turnIn(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/quests/${id}/turn-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo entregar la misión."); return; }
      setStates((prev) => ({ ...prev, [id]: "turned_in" }));
      toast.success("¡Entregada! Mostrale esto a un Asistente del Gremio.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {missions.map((m) => {
        const state = states[m.id];
        const soldOut = m.maxPerEvent > 0 && m.usedCount >= m.maxPerEvent && state === "available";
        return (
          <div key={m.id} className={cn("border border-border px-3.5 py-3 bg-parchment/50 flex flex-col gap-2", state === "completed" && "opacity-70")}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="font-label text-sm font-semibold text-ink">{m.title}</p>
              <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                {DIFFICULTY_LABELS[m.difficulty]}
              </span>
            </div>
            {m.narrative && <p className="font-body text-sm text-ink-light leading-relaxed">{m.narrative}</p>}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-label text-2xs text-brass">
                +{m.rewardXp} XP · +{m.rewardRp} RP{m.badgeName ? ` · insignia "${m.badgeName}"` : ""}
              </span>
              {m.game && (
                <span className="inline-flex items-center gap-1.5 font-label text-2xs text-leather-light">
                  <span className="relative size-4 shrink-0 rounded-sm overflow-hidden bg-parchment-dark/40">
                    {m.game.image_url ? (
                      <Image src={m.game.image_url} alt="" fill className="object-cover" sizes="16px" />
                    ) : (
                      <Dice5 size={10} className="absolute inset-0 m-auto text-leather-light" />
                    )}
                  </span>
                  {m.game.name}
                </span>
              )}
            </div>

            <div className="mt-1">
              {state === "completed" ? (
                <p className="text-center font-label text-xs uppercase tracking-wide px-3 py-2 border border-moss bg-moss/10 text-moss-dark flex items-center justify-center gap-1.5">
                  <Check size={13} /> Completada
                </p>
              ) : !isLive ? (
                <p className="text-center font-label text-xs uppercase tracking-wide px-3 py-2 border border-border text-ink-light">
                  {state === "turned_in" ? "Entregada — esperando confirmación" : state === "active" ? "En curso" : inactiveNote}
                </p>
              ) : !loggedIn ? (
                <Link
                  href={`/sign-in?next=/events/${eventId}`}
                  className="block text-center font-label text-xs uppercase tracking-wide px-3 py-2 border border-border text-ink-light no-underline hover:border-brass transition-colors"
                >
                  Iniciá sesión para activar
                </Link>
              ) : state === "turned_in" ? (
                <p className="text-center font-label text-xs uppercase tracking-wide px-3 py-2 border border-brass/40 bg-brass/5 text-brass">
                  Entregada — esperando confirmación
                </p>
              ) : state === "active" ? (
                <button
                  type="button"
                  onClick={() => turnIn(m.id)}
                  disabled={busyId === m.id}
                  className="w-full font-label text-xs uppercase tracking-wide px-3 py-2 border border-crimson text-crimson hover:bg-crimson/10 transition-colors disabled:opacity-50"
                >
                  Entregar misión
                </button>
              ) : soldOut ? (
                <p className="text-center font-label text-xs uppercase tracking-wide px-3 py-2 border border-border text-ink-light">
                  Cupo agotado
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => activate(m.id)}
                  disabled={busyId === m.id}
                  className="w-full font-label text-xs uppercase tracking-wide px-3 py-2 border border-crimson bg-crimson text-crimson-foreground hover:bg-crimson/90 transition-colors disabled:opacity-50"
                >
                  Activar misión
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
