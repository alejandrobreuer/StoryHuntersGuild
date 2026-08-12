"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ProgressBar } from "@/components/ui/ProgressBar";
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
    <section className="mb-10">
      <p className="font-label text-xs uppercase tracking-widest text-brass mb-1.5">Misión del evento</p>
      <div className="relative border border-brass rounded-md bg-gradient-to-br from-parchment-card to-parchment px-6 py-7 sm:px-9 shadow-parchment-lg overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-2.5 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(180deg, #A9793A 0 4px, transparent 4px 14px)" }} />
        <div className="absolute inset-y-0 right-0 w-2.5 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(180deg, #A9793A 0 4px, transparent 4px 14px)" }} />

        <h2 className="font-display text-2xl text-ink mb-2">{mission.title}</h2>
        {mission.narrative && (
          <p className="font-body text-sm text-ink-light leading-relaxed mb-5 max-w-2xl">{mission.narrative}</p>
        )}

        <div className="flex items-center justify-between font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">
          <span>Entregas aprobadas</span>
          <span><b className="text-crimson text-sm">{mission.confirmedCount}</b> / {mission.requiredTurnIns}</span>
        </div>
        <ProgressBar value={mission.confirmedCount} max={mission.requiredTurnIns} className="border border-brass/30" />

        <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
          <p className="font-label text-2xs text-brass">
            +{mission.rewardXp} XP · +{mission.rewardRp} RP para todos los que entreguen{mission.badgeName ? ` · insignia "${mission.badgeName}"` : ""}
          </p>

          {mission.linkStatus === "achieved" ? (
            <span className="font-label text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-moss bg-moss/10 text-moss-dark">
              ¡Misión lograda!
            </span>
          ) : mission.linkStatus === "failed" ? (
            <span className="font-label text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-border text-ink-light">
              No se logró a tiempo
            </span>
          ) : state === "confirmed" ? (
            <span className="font-label text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-moss bg-moss/10 text-moss-dark">
              ¡Aprobada! Esperando que el gremio alcance la meta.
            </span>
          ) : state === "turned_in" ? (
            <span className="font-label text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-brass/40 bg-brass/5 text-brass">
              Pendiente de aprobación del administrador
            </span>
          ) : !isLive ? (
            <span className="font-label text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-border text-ink-light">
              Se activa cuando el evento empiece
            </span>
          ) : !loggedIn ? (
            <Link
              href={`/sign-in?next=/events/${eventId}`}
              className="font-label text-xs uppercase tracking-wide px-4 py-1.5 rounded-sm border border-crimson text-crimson no-underline hover:bg-crimson/10 transition-colors"
            >
              Iniciá sesión para entregar
            </Link>
          ) : (
            <button
              type="button"
              onClick={turnIn}
              disabled={busy}
              className="font-label text-xs uppercase tracking-wide px-5 py-1.5 rounded-sm border border-crimson bg-crimson text-crimson-foreground hover:bg-crimson/90 transition-colors disabled:opacity-50"
            >
              Entregar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
