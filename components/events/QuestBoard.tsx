"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Dice5, Check, Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS } from "@/lib/gamification/questDifficulty";
import { MissionInfoButton } from "@/components/ui/MissionInfoButton";
import type { QuestDifficulty, QuestGroupStatus, QuestType } from "@/types/database";

export type MissionActivationState = "available" | "active" | "turned_in" | "rejected" | "completed";

export interface IndividualMissionItem {
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

export interface GroupMemberInfo { id: string; label: string; }
export interface GroupInstance { id: string; status: QuestGroupStatus; members: GroupMemberInfo[]; }
export interface GroupMissionItem {
  id:              string;
  title:           string;
  narrative:       string | null;
  difficulty:      QuestDifficulty;
  rewardXp:        number;
  rewardRp:        number;
  badgeName:       string | null;
  game:            { name: string; image_url: string | null } | null;
  maxParticipants: number;
  /** Every live (forming/started/turned_in) party currently attempting this mission at this event. */
  groups:          GroupInstance[];
  /** Which of the groups above the viewer belongs to, if any. */
  viewerGroupId:   string | null;
  /** Already earned this mission's reward before — grayed out, can't re-join. */
  viewerRewarded:  boolean;
}

interface QuestBoardProps {
  eventId:            string;
  individualMissions: IndividualMissionItem[];
  groupMissions:      GroupMissionItem[];
  loggedIn:           boolean;
  isLive:             boolean;
  inactiveNote:       string;
}

// Real parchment art, alternated so no two adjacent cards look identical,
// each given its own small (subtle!) rotation so they read as individually
// pinned notes rather than a uniform grid.
const QUEST_PAPER_IMAGES = [
  "/images/quest-paper-classic-red-seal.png",
  "/images/quest-paper-formal-burgundy-seal.png",
  "/images/quest-paper-guild-blue-seal.png",
  "/images/quest-paper-rugged-green-seal.png",
];
const PAPER_ANGLES = [-1.5, 1, -0.75, 1.25, -1, 0.5];

function QuestPaperCard({
  index, infoType, className, children,
}: {
  index: number; infoType: QuestType; className?: string; children: React.ReactNode;
}) {
  const paperSrc = QUEST_PAPER_IMAGES[index % QUEST_PAPER_IMAGES.length];
  const angle = PAPER_ANGLES[index % PAPER_ANGLES.length];
  return (
    <div style={{ transform: `rotate(${angle}deg)` }}>
      {/* The images are square (1254x1254) — aspect-square keeps object-contain
       * from letterboxing, which would otherwise throw off the padding below. */}
      <div className={cn("relative aspect-square w-full", className)}>
        {/* The paper's own torn/burnt edges and corner ornaments (including a
         * wax seal that lands in a different corner per variant) are part of
         * the art — generous padding keeps text and controls clear of all of
         * them rather than clipping the image to a rectangle. */}
        <Image src={paperSrc} alt="" fill sizes="380px" className="object-contain pointer-events-none select-none" />
        <MissionInfoButton type={infoType} className="top-[22px] right-[22px]" />
        <div className="absolute inset-0 flex flex-col gap-2 px-[52px] pt-14 pb-[72px] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function GameChip({ game }: { game: { name: string; image_url: string | null } }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-label text-2xs text-leather-light">
      <span className="relative size-4 shrink-0 rounded-sm overflow-hidden bg-parchment-dark/40">
        {game.image_url ? (
          <Image src={game.image_url} alt="" fill className="object-cover" sizes="16px" />
        ) : (
          <Dice5 size={10} className="absolute inset-0 m-auto text-leather-light" />
        )}
      </span>
      {game.name}
    </span>
  );
}

export function QuestBoard({ eventId, individualMissions, groupMissions, loggedIn, isLive, inactiveNote }: QuestBoardProps) {
  const router = useRouter();
  const [states, setStates] = React.useState<Record<string, MissionActivationState>>(
    () => Object.fromEntries(individualMissions.map((m) => [m.id, m.initialState]))
  );
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

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

  async function groupAction(url: string, body: object, key: string, successMsg: string) {
    setBusyKey(key);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Ocurrió un error."); return; }
      toast.success(successMsg);
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  const joinGroup = (questId: string, groupId: string | null) =>
    groupAction(`/api/quests/${questId}/group/join`, { eventId, groupId }, `${questId}:${groupId ?? "new"}`, groupId ? "Te uniste al grupo." : "Nuevo grupo creado — ¡invitá a tu equipo!");
  const leaveGroup = (questId: string, groupId: string) =>
    groupAction(`/api/quests/${questId}/group/leave`, { groupId }, groupId, "Saliste del grupo.");
  const startGroup = (questId: string, groupId: string) =>
    groupAction(`/api/quests/${questId}/group/start`, { groupId }, groupId, "¡Misión iniciada!");
  const turnInGroup = (questId: string, groupId: string) =>
    groupAction(`/api/quests/${questId}/group/turn-in`, { groupId }, groupId, "¡Entregada! Esperando confirmación.");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 pb-1">
      {individualMissions.map((m, i) => {
        const state = states[m.id];
        const soldOut = m.maxPerEvent > 0 && m.usedCount >= m.maxPerEvent && state === "available";
        return (
          <QuestPaperCard key={m.id} index={i} infoType="individual" className={state === "completed" ? "opacity-60" : undefined}>
            <div className="flex items-start justify-between gap-2 flex-wrap pr-7">
              <p className="font-label text-sm font-semibold text-ink">{m.title}</p>
              <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                {DIFFICULTY_LABELS[m.difficulty]}
              </span>
            </div>
            {m.narrative && <p className="font-body text-sm text-ink-light leading-relaxed">{m.narrative}</p>}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-label text-2xs font-semibold text-[#8a6420]">
                +{m.rewardXp} XP · +{m.rewardRp} RP{m.badgeName ? ` · insignia "${m.badgeName}"` : ""}
              </span>
              {m.game && <GameChip game={m.game} />}
            </div>

            {state === "rejected" && (
              <p className="font-label text-2xs text-crimson -mb-1">No se confirmó tu última entrega — podés volver a intentarlo.</p>
            )}

            <div className="mt-1">
              {state === "completed" ? (
                <p className="text-center font-label text-xs uppercase tracking-wide px-3 py-2 border border-moss bg-moss/10 text-moss-dark flex items-center justify-center gap-1.5">
                  <Check size={13} /> Ya la completaste
                </p>
              ) : !isLive ? (
                <p className="text-center font-label text-xs uppercase tracking-wide px-3 py-2 border border-border text-ink-light">
                  {state === "turned_in" ? "Pendiente de aprobación del administrador" : state === "active" ? "En curso" : inactiveNote}
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
                  Pendiente de aprobación del administrador
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
          </QuestPaperCard>
        );
      })}

      {groupMissions.map((m, i) => {
        const viewerGroup = m.groups.find((g) => g.id === m.viewerGroupId) ?? null;
        const canFormNew = loggedIn && isLive && !m.viewerRewarded && !viewerGroup;
        return (
          <QuestPaperCard
            key={m.id}
            index={individualMissions.length + i}
            infoType="group"
            className={m.viewerRewarded ? "opacity-60" : undefined}
          >
            <div className="flex items-start justify-between gap-2 flex-wrap pr-7">
              <p className="font-label text-sm font-semibold text-ink">{m.title}</p>
              <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                {DIFFICULTY_LABELS[m.difficulty]}
              </span>
            </div>
            {m.narrative && <p className="font-body text-sm text-ink-light leading-relaxed">{m.narrative}</p>}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-label text-2xs font-semibold text-[#8a6420]">
                +{m.rewardXp} XP · +{m.rewardRp} RP{m.badgeName ? ` · insignia "${m.badgeName}"` : ""}
              </span>
              {m.game && <GameChip game={m.game} />}
              <span className="inline-flex items-center gap-1 font-label text-2xs text-leather-light">
                <Users size={11} /> hasta {m.maxParticipants}
              </span>
            </div>

            {m.viewerRewarded ? (
              <p className="text-center font-label text-xs uppercase tracking-wide px-3 py-2 border border-moss bg-moss/10 text-moss-dark flex items-center justify-center gap-1.5 mt-1">
                <Check size={13} /> Ya la completaste
              </p>
            ) : !isLive ? (
              <p className="text-center font-label text-xs uppercase tracking-wide px-3 py-2 border border-border text-ink-light mt-1">
                {inactiveNote}
              </p>
            ) : !loggedIn ? (
              <Link
                href={`/sign-in?next=/events/${eventId}`}
                className="block text-center font-label text-xs uppercase tracking-wide px-3 py-2 border border-border text-ink-light no-underline hover:border-brass transition-colors mt-1"
              >
                Iniciá sesión para unirte
              </Link>
            ) : (
              <div className="flex flex-col gap-1.5 mt-1">
                {m.groups.map((g) => {
                  const isMine = g.id === m.viewerGroupId;
                  const full = g.members.length >= m.maxParticipants;
                  return (
                    <div key={g.id} className={cn("border rounded-sm px-2.5 py-2", isMine ? "border-crimson bg-crimson/5" : "border-border bg-parchment/40")}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-body text-xs text-ink-light">
                          {g.members.map((mem) => mem.label).join(", ") || "Sin integrantes"}{" "}
                          <span className="opacity-60">({g.members.length}/{m.maxParticipants})</span>
                        </span>
                        {g.status !== "forming" && (
                          <span className="font-label text-2xs uppercase tracking-wide text-brass shrink-0">
                            {g.status === "started" ? "En curso" : "Esperando confirmación"}
                          </span>
                        )}
                      </div>
                      {isMine && g.status === "forming" && (
                        <div className="flex gap-1.5 mt-1.5">
                          {g.members.length >= 2 && (
                            <button
                              type="button" onClick={() => startGroup(m.id, g.id)} disabled={busyKey === g.id}
                              className="flex-1 font-label text-2xs uppercase tracking-wide px-2.5 py-1.5 border border-crimson bg-crimson text-crimson-foreground hover:bg-crimson/90 transition-colors disabled:opacity-50"
                            >
                              Iniciar misión
                            </button>
                          )}
                          <button
                            type="button" onClick={() => leaveGroup(m.id, g.id)} disabled={busyKey === g.id}
                            className="font-label text-2xs uppercase tracking-wide px-2.5 py-1.5 border border-border text-ink-light hover:border-crimson transition-colors disabled:opacity-50"
                          >
                            Salir
                          </button>
                        </div>
                      )}
                      {isMine && g.status === "started" && (
                        <button
                          type="button" onClick={() => turnInGroup(m.id, g.id)} disabled={busyKey === g.id}
                          className="w-full mt-1.5 font-label text-2xs uppercase tracking-wide px-2.5 py-1.5 border border-crimson text-crimson hover:bg-crimson/10 transition-colors disabled:opacity-50"
                        >
                          Entregar misión
                        </button>
                      )}
                      {!isMine && !viewerGroup && g.status === "forming" && !full && (
                        <button
                          type="button" onClick={() => joinGroup(m.id, g.id)} disabled={busyKey === `${m.id}:${g.id}`}
                          className="w-full mt-1.5 font-label text-2xs uppercase tracking-wide px-2.5 py-1.5 border border-crimson text-crimson hover:bg-crimson/10 transition-colors disabled:opacity-50"
                        >
                          Unirse
                        </button>
                      )}
                    </div>
                  );
                })}

                {canFormNew && (
                  <button
                    type="button"
                    onClick={() => joinGroup(m.id, null)}
                    disabled={busyKey === `${m.id}:new`}
                    className="flex items-center justify-center gap-1.5 font-label text-2xs uppercase tracking-wide px-2.5 py-2 border border-dashed border-brass/50 text-brass hover:bg-brass/5 transition-colors disabled:opacity-50"
                  >
                    <Plus size={12} /> Formar un nuevo grupo
                  </button>
                )}
              </div>
            )}
          </QuestPaperCard>
        );
      })}
    </div>
  );
}
