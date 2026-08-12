"use client";

import * as React from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { toast } from "sonner";

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

// A thin, high-contrast strip pinned between the nav and the hero — meant
// to read as an urgent guild-wide call to action, not another content
// section. Guild Missions are repeatable: once a Guild Attendant confirms a
// turn-in, the player can submit again, so there's no "already completed"
// grayed state here, just a "pending" note while one's in flight.
export function GuildMissionSection({ mission, loggedIn, viewerPending }: GuildMissionSectionProps) {
  const [pending, setPending] = React.useState(viewerPending);
  const [busy, setBusy] = React.useState(false);
  const pct = mission.goalCount > 0 ? Math.min(100, (mission.totalApproved / mission.goalCount) * 100) : 0;

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
    <div className="relative bg-gradient-to-r from-leather via-crimson to-leather border-y-2 border-brass-bright shadow-glow z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center sm:justify-between gap-x-4 gap-y-1 flex-wrap text-center sm:text-left">
        <div className="flex items-center gap-2 min-w-0">
          <Flame size={15} className="text-brass-bright shrink-0 animate-pulse" />
          <p className="font-label text-2xs sm:text-xs font-semibold uppercase tracking-wide text-parchment truncate">
            <span className="text-brass-bright">Misión de Gremio</span> · {mission.title}
          </p>
          <span className="hidden md:inline font-label text-2xs text-parchment/70 shrink-0">
            {mission.totalApproved}/{mission.goalCount} · +{mission.rewardXp} XP · +{mission.rewardRp} RP
          </span>
        </div>

        <div className="shrink-0">
          {pending ? (
            <span className="font-label text-2xs uppercase tracking-wide px-3 py-1 rounded-full border border-brass-bright/60 text-brass-bright">
              Pendiente de aprobación
            </span>
          ) : !loggedIn ? (
            <Link
              href="/sign-in?next=/"
              className="font-label text-2xs uppercase tracking-wide px-3 py-1 rounded-full bg-brass-bright text-ink no-underline hover:bg-brass transition-colors"
            >
              Iniciá sesión para entregar
            </Link>
          ) : (
            <button
              type="button"
              onClick={turnIn}
              disabled={busy}
              className="font-label text-2xs uppercase tracking-wide px-4 py-1 rounded-full bg-brass-bright text-ink hover:bg-brass transition-colors disabled:opacity-50"
            >
              Entregar
            </button>
          )}
        </div>
      </div>

      <div className="h-[3px] w-full bg-black/30">
        <div className="h-full bg-brass-bright transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
