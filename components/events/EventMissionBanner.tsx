"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MissionInfoButton } from "@/components/ui/MissionInfoButton";
import type { QuestEventStatus } from "@/types/database";

export interface EventMissionData {
  id:              string;
  title:           string;
  narrative:       string | null;
  rewardXp:        number;
  rewardRp:        number;
  badgeName:       string | null;
  requiredTurnIns: number;
  confirmedCount:  number;
  linkStatus:      QuestEventStatus;
}

export type EventMissionViewerState = "none" | "turned_in" | "confirmed";

interface EventMissionBannerProps {
  eventId:      string;
  mission:      EventMissionData;
  loggedIn:     boolean;
  isLive:       boolean;
  viewerState:  EventMissionViewerState;
}

// Everyone at the event is assigned to this by default — no activate step,
// straight to "Entregar". Turning in just marks it pending; an admin still
// has to approve each one (see admin complete/route.ts) before it counts
// toward requiredTurnIns — only once enough are approved does the mission
// achieve and reward everyone in one batch.
//
// Laid out as a short, wide strip (title/reward left, progress middle,
// action right) rather than a tall stacked card — it shares the page with
// the Quest Board and shouldn't dominate it.
export function EventMissionBanner({ eventId, mission, loggedIn, isLive, viewerState }: EventMissionBannerProps) {
  const [state, setState] = React.useState<EventMissionViewerState>(viewerState);
  const [busy, setBusy] = React.useState(false);

  async function turnIn() {
    setBusy(true);
    try {
      const res = await fetch(`/api/quests/${mission.id}/turn-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo entregar la misión."); return; }
      setState("turned_in");
      toast.success("¡Entregada! Un Asistente del Gremio la va a aprobar en el lugar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6">
      <p className="font-label text-2xs uppercase tracking-widest text-brass mb-1">Misión del evento</p>
      <div className="relative border border-brass rounded-md bg-gradient-to-br from-parchment-card to-parchment px-4 py-3.5 sm:px-6 shadow-parchment overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1.5 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(180deg, #A9793A 0 4px, transparent 4px 14px)" }} />
        <div className="absolute inset-y-0 right-0 w-1.5 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(180deg, #A9793A 0 4px, transparent 4px 14px)" }} />
        <MissionInfoButton type="event" className="top-2.5 right-4" />

        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5 pr-6">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg text-ink leading-tight mb-0.5">{mission.title}</h2>
            {mission.narrative && (
              <p className="font-body text-xs text-ink-light leading-snug line-clamp-2 mb-1">{mission.narrative}</p>
            )}
            <p className="font-label text-2xs text-brass">
              +{mission.rewardXp} XP · +{mission.rewardRp} RP{mission.badgeName ? ` · insignia "${mission.badgeName}"` : ""}
            </p>
          </div>

          <div className="md:w-52 shrink-0">
            <div className="flex items-center justify-between font-label text-2xs uppercase tracking-widest text-leather-light mb-1">
              <span>Entregas</span>
              <span><b className="text-crimson">{mission.confirmedCount}</b> / {mission.requiredTurnIns}</span>
            </div>
            <ProgressBar value={mission.confirmedCount} max={mission.requiredTurnIns} trackClassName="h-2 border border-brass/30" />
          </div>

          <div className="shrink-0">
            {mission.linkStatus === "achieved" ? (
              <span className="font-label text-2xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-moss bg-moss/10 text-moss-dark whitespace-nowrap">
                ¡Lograda!
              </span>
            ) : mission.linkStatus === "failed" ? (
              <span className="font-label text-2xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-border text-ink-light whitespace-nowrap">
                No lograda
              </span>
            ) : state === "confirmed" ? (
              <span className="font-label text-2xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-moss bg-moss/10 text-moss-dark whitespace-nowrap">
                ¡Aprobada!
              </span>
            ) : state === "turned_in" ? (
              <span className="font-label text-2xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-brass/40 bg-brass/5 text-brass whitespace-nowrap">
                Pendiente de aprobación
              </span>
            ) : !isLive ? (
              <span className="font-label text-2xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-border text-ink-light whitespace-nowrap">
                Se activa al empezar
              </span>
            ) : !loggedIn ? (
              <Link
                href={`/sign-in?next=/events/${eventId}`}
                className="font-label text-2xs uppercase tracking-wide px-3.5 py-1.5 rounded-sm border border-crimson text-crimson no-underline hover:bg-crimson/10 transition-colors whitespace-nowrap"
              >
                Iniciá sesión
              </Link>
            ) : (
              <button
                type="button"
                onClick={turnIn}
                disabled={busy}
                className="font-label text-2xs uppercase tracking-wide px-4 py-1.5 rounded-sm border border-crimson bg-crimson text-crimson-foreground hover:bg-crimson/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                Entregar
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
