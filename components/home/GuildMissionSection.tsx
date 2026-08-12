"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ProgressBar } from "@/components/ui/ProgressBar";

export interface GuildMissionData {
  id:            string;
  title:         string;
  narrative:     string | null;
  rewardXp:      number;
  rewardRp:      number;
  badgeName:     string | null;
  goalCount:     number;
  totalApproved: number;
}

interface GuildMissionSectionProps {
  mission:       GuildMissionData;
  loggedIn:      boolean;
  viewerPending: boolean;
}

// Guild Missions are repeatable: once a Guild Attendant confirms a turn-in,
// the player can submit again — so there's no "already completed" grayed
// state here, just a "pending confirmation" note while one's in flight.
export function GuildMissionSection({ mission, loggedIn, viewerPending }: GuildMissionSectionProps) {
  const [pending, setPending] = React.useState(viewerPending);
  const [busy, setBusy] = React.useState(false);

  async function turnIn() {
    setBusy(true);
    try {
      const res = await fetch(`/api/quests/${mission.id}/guild-turn-in`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo entregar la misión."); return; }
      setPending(true);
      toast.success("¡Entregada! Un Asistente del Gremio la va a confirmar pronto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-gradient-to-b from-parchment to-parchment-dark px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <p className="font-label text-xs uppercase tracking-widest text-brass text-center mb-1.5">Misión de Gremio</p>
        <h2 className="font-display text-2xl sm:text-3xl text-ink text-center mb-6">{mission.title}</h2>

        <div className="border border-brass rounded-md bg-gradient-to-br from-parchment-card to-parchment px-6 py-7 sm:px-9 shadow-parchment-lg">
          {mission.narrative && (
            <p className="font-body text-sm text-ink-light leading-relaxed mb-5 text-center max-w-xl mx-auto">{mission.narrative}</p>
          )}

          <div className="flex items-center justify-between font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">
            <span>Progreso del gremio</span>
            <span><b className="text-crimson text-sm">{mission.totalApproved}</b> / {mission.goalCount}</span>
          </div>
          <ProgressBar value={mission.totalApproved} max={mission.goalCount} className="border border-brass/30" />

          <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
            <p className="font-label text-2xs text-brass">
              +{mission.rewardXp} XP · +{mission.rewardRp} RP{mission.badgeName ? ` · insignia "${mission.badgeName}"` : ""}
            </p>
            {pending ? (
              <span className="font-label text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-brass/40 bg-brass/5 text-brass">
                Pendiente de confirmación
              </span>
            ) : !loggedIn ? (
              <Link
                href="/sign-in?next=/"
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
      </div>
    </section>
  );
}
