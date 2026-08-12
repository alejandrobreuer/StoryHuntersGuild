"use client";

import * as React from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";

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

// A high-contrast strip pinned between the nav and the hero — meant to read
// as an urgent guild-wide call to action, not another content section.
// Clicking anywhere on it (besides the action control) opens a modal with
// the full story. Guild Missions are repeatable: once a Guild Attendant
// confirms a turn-in, the player can submit again, so there's no "already
// completed" grayed state here, just a "pending" note while one's in flight.
export function GuildMissionSection({ mission, loggedIn, viewerPending }: GuildMissionSectionProps) {
  const [pending, setPending] = React.useState(viewerPending);
  const [busy, setBusy] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  async function turnIn(e: React.SyntheticEvent) {
    e.stopPropagation();
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

  function action(size: "sm" | "md") {
    const pad = size === "sm" ? "px-4 py-1.5" : "px-5 py-2";
    const text = size === "sm" ? "text-2xs" : "text-xs";
    if (pending) {
      return (
        <span className={`font-label ${text} uppercase tracking-wide ${pad} rounded-full border border-brass-bright/60 text-brass-bright`}>
          Pendiente de aprobación
        </span>
      );
    }
    if (!loggedIn) {
      return (
        <Link
          href="/sign-in?next=/"
          onClick={(e) => e.stopPropagation()}
          className={`font-label ${text} uppercase tracking-wide ${pad} rounded-full bg-brass-bright text-ink no-underline hover:bg-brass transition-colors`}
        >
          Iniciá sesión para entregar
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={turnIn}
        disabled={busy}
        className={`font-label ${text} uppercase tracking-wide ${pad} rounded-full bg-brass-bright text-ink hover:bg-brass transition-colors disabled:opacity-50`}
      >
        Entregar
      </button>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetailsOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailsOpen(true); } }}
        className="relative bg-gradient-to-r from-leather via-crimson to-leather border-y-2 border-brass-bright shadow-glow z-10 cursor-pointer"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-center sm:justify-between gap-x-4 gap-y-2 flex-wrap text-center sm:text-left mb-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Flame size={20} className="text-brass-bright shrink-0 animate-pulse" />
              <div className="min-w-0">
                <p className="font-label text-xs sm:text-sm font-semibold uppercase tracking-wide text-parchment truncate">
                  <span className="text-brass-bright">Misión de Gremio</span> · {mission.title}
                </p>
                <p className="font-label text-2xs text-parchment/70">
                  +{mission.rewardXp} XP · +{mission.rewardRp} RP{mission.badgeName ? ` · insignia "${mission.badgeName}"` : ""}
                </p>
              </div>
            </div>

            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {action("sm")}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProgressBar
              value={mission.totalApproved}
              max={mission.goalCount}
              animated
              trackClassName="h-2.5 bg-black/30"
              fillClassName="bg-brass-bright"
            />
            <span className="font-label text-2xs text-parchment shrink-0 tabular-nums">
              {mission.totalApproved}/{mission.goalCount}
            </span>
          </div>
        </div>
      </div>

      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={mission.title} className="max-w-lg">
        <div className="flex flex-col gap-4">
          <p className="font-label text-2xs uppercase tracking-widest text-brass">Misión de Gremio</p>

          {mission.narrative && (
            <p className="font-body text-sm text-ink-light leading-relaxed">{mission.narrative}</p>
          )}

          <div>
            <div className="flex items-center justify-between font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">
              <span>Progreso del gremio</span>
              <span><b className="text-crimson text-sm">{mission.totalApproved}</b> / {mission.goalCount}</span>
            </div>
            <ProgressBar value={mission.totalApproved} max={mission.goalCount} animated trackClassName="h-3 border border-brass/30" />
          </div>

          <p className="font-label text-2xs text-brass">
            +{mission.rewardXp} XP · +{mission.rewardRp} RP para todos los que entreguen{mission.badgeName ? ` · insignia "${mission.badgeName}"` : ""}
          </p>

          <div>{action("md")}</div>
        </div>
      </Modal>
    </>
  );
}
