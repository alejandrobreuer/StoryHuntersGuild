"use client";

import * as React from "react";
import { Check, ScrollText, Users, Compass, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestType } from "@/types/database";

export interface LedgerQuest {
  id:         string;
  title:      string;
  narrative:  string | null;
  type:       QuestType;
  reward_xp:  number;
  reward_rp:  number;
  badge:      { name: string } | null;
  status:     "done" | "in_progress" | "available";
  guild:      { mine: number; guildTotal: number; goal: number | null } | null;
}

const TAB_CONFIG: { key: QuestType; label: string; icon: typeof ScrollText }[] = [
  { key: "individual", label: "Individual", icon: ScrollText },
  { key: "group", label: "Grupo", icon: Users },
  { key: "event", label: "Evento", icon: Star },
  { key: "guild", label: "Gremio", icon: Compass },
];

export function QuestLedger({ quests }: { quests: LedgerQuest[] }) {
  const available = TAB_CONFIG.filter((t) => quests.some((q) => q.type === t.key));
  const [tab, setTab] = React.useState<QuestType | null>(null);

  if (available.length === 0) {
    return <p className="font-body italic text-sm text-ink-light">Todavía no hay misiones activas por el momento.</p>;
  }

  const activeTab = tab && available.some((t) => t.key === tab) ? tab : available[0].key;
  const shown = quests.filter((q) => q.type === activeTab);

  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {available.map(({ key, label, icon: Icon }) => {
          const isActive = key === activeTab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 font-label text-2xs uppercase tracking-wide px-3.5 py-2 border border-brass/40 rounded-t-sm transition-colors relative top-px",
                isActive
                  ? "bg-parchment text-crimson border-b-parchment"
                  : "bg-parchment-dark/60 text-leather-light hover:text-ink"
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="border border-brass/40 rounded-b-sm rounded-tr-sm bg-parchment p-1.5">
        {shown.length === 0 ? (
          <p className="font-body italic text-sm text-ink-light p-3">No hay misiones activas en esta categoría.</p>
        ) : (
          shown.map((q, i) => (
            <div
              key={q.id}
              className={cn(
                "flex items-center justify-between gap-3 p-3",
                i < shown.length - 1 && "border-b border-dashed border-brass/30"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm text-ink">{q.title}</p>
                {q.narrative && <p className="font-body text-xs text-ink-light italic mt-0.5 line-clamp-1">{q.narrative}</p>}
                {q.guild && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 max-w-[220px] h-1.5 bg-parchment-dark/50 rounded-full overflow-hidden border border-brass/30">
                      <div
                        className="h-full bg-crimson"
                        style={{ width: `${q.guild.goal ? Math.min(100, (q.guild.guildTotal / q.guild.goal) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="font-label text-2xs text-leather-light whitespace-nowrap">
                      Gremio {q.guild.guildTotal}/{q.guild.goal ?? "—"} · vos: {q.guild.mine}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="font-label text-2xs text-brass whitespace-nowrap">
                  +{q.reward_xp} XP{q.reward_rp > 0 ? ` · +${q.reward_rp} RP` : ""}{q.badge ? ` · ${q.badge.name}` : ""}
                </span>
                {q.status === "done" ? (
                  <span className="flex items-center justify-center size-5 rounded-full bg-leather text-parchment shrink-0">
                    <Check size={12} />
                  </span>
                ) : q.status === "in_progress" ? (
                  <span className="font-label text-2xs text-crimson border border-crimson rounded-full px-2 py-0.5 whitespace-nowrap">
                    En progreso
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
