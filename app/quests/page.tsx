import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Dice5 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/features";
import { DIFFICULTY_LABELS } from "@/lib/gamification/questDifficulty";
import { formatDateTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { QuestDifficulty, QuestEventStatus } from "@/types/database";

export const metadata = { title: "Misiones — Story Hunters Guild" };
export const dynamic = "force-dynamic";

interface BadgeInfo { id: string; name: string; icon: string | null; }
interface GameInfo { name: string; image_url: string | null; }
interface EventInfo { id: string; title: string; slug: string; starts_at: string; status: string; }
interface EventLinkInfo { status: QuestEventStatus; event: EventInfo | EventInfo[] | null; }
interface QuestRow {
  id: string; title: string; narrative: string | null; type: "individual" | "group" | "event" | "guild";
  reward_xp: number; reward_rp: number; difficulty: QuestDifficulty;
  badge: BadgeInfo | BadgeInfo[] | null; game: GameInfo | GameInfo[] | null;
  quest_events: EventLinkInfo[] | null;
}

const EVENT_STATUS_LABELS: Record<QuestEventStatus, string> = { open: "En curso", achieved: "Lograda", failed: "No lograda" };
const EVENT_STATUS_STYLES: Record<QuestEventStatus, string> = {
  open: "bg-brass/15 text-brass", achieved: "bg-moss/15 text-moss-dark", failed: "bg-crimson/15 text-crimson",
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function DifficultyBadge({ difficulty }: { difficulty: QuestDifficulty }) {
  return (
    <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}

function GameChip({ game }: { game: GameInfo }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-label text-2xs text-ink-light">
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

function QuestCard({ quest }: { quest: QuestRow }) {
  const badge = one(quest.badge);
  const game = one(quest.game);
  return (
    <div className="surface-parchment p-5">
      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
        <p className="font-label text-sm font-bold text-ink">{quest.title}</p>
        <DifficultyBadge difficulty={quest.difficulty} />
      </div>
      {quest.narrative && <p className="font-body text-sm text-ink-light mt-1 leading-relaxed">{quest.narrative}</p>}
      <div className="flex items-center gap-3 flex-wrap mt-2">
        <p className="font-body text-xs text-brass">
          +{quest.reward_xp} XP · +{quest.reward_rp} RP{badge ? ` · insignia "${badge.name}"` : ""}
        </p>
        {game && <GameChip game={game} />}
      </div>
    </div>
  );
}

export default async function QuestsPage() {
  const features = await getFeatureFlags();
  if (!features.quests) redirect("/");

  const admin = createAdminClient();
  const { data } = await admin
    .from("shg_quests")
    .select("*, badge:shg_badges(id, name, icon), game:shg_games(name, image_url), quest_events:shg_quest_events(status, event:shg_events(id, title, slug, starts_at, status))")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const quests = (data ?? []) as unknown as QuestRow[];
  const individualGroup = quests.filter((q) => q.type === "individual" || q.type === "group");
  const eventQuests = quests.filter((q) => q.type === "event");

  const isEmpty = quests.filter((q) => q.type !== "guild").length === 0;

  return (
    <main className="max-w-4xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment text-center mb-2">Tablón de Misiones</h1>
      <p className="font-body text-sm text-parchment-dark text-center mb-10 max-w-xl mx-auto">
        Desafíos del gremio para ganar experiencia y puntos de rango. Un Asistente del Gremio confirma
        cada misión completada — preguntá en tu próxima visita.
      </p>

      {isEmpty && (
        <p className="font-body italic text-center text-parchment-dark py-12">
          No hay misiones activas por el momento. ¡Volvé pronto!
        </p>
      )}

      {individualGroup.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl text-parchment mb-3">Misiones Individuales y de Grupo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {individualGroup.map((q) => <QuestCard key={q.id} quest={q} />)}
          </div>
        </section>
      )}

      {eventQuests.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-parchment mb-3">Misiones de Evento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {eventQuests.map((q) => {
              const badge = one(q.badge);
              const game = one(q.game);
              const events = (q.quest_events ?? [])
                .map((qe) => {
                  const e = one(qe.event);
                  return e && e.status === "published" ? { ...e, linkStatus: qe.status } : null;
                })
                .filter((e): e is EventInfo & { linkStatus: QuestEventStatus } => Boolean(e))
                .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
              return (
                <div key={q.id} className="surface-parchment p-5">
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                    <p className="font-label text-sm font-bold text-ink">{q.title}</p>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </div>
                  {q.narrative && <p className="font-body text-sm text-ink-light mt-1 leading-relaxed">{q.narrative}</p>}
                  <div className="flex items-center gap-3 flex-wrap mt-2">
                    <p className="font-body text-xs text-brass">
                      +{q.reward_xp} XP · +{q.reward_rp} RP{badge ? ` · insignia "${badge.name}"` : ""}
                    </p>
                    {game && <GameChip game={game} />}
                  </div>
                  {events.length > 0 ? (
                    <div className="flex flex-col gap-1.5 mt-2">
                      {events.map((event) => (
                        <div key={event.id} className="flex items-center gap-2 flex-wrap">
                          <Link href={`/events/${event.id}`} className="font-body text-xs text-ink-light underline inline-block">
                            {event.title} — {formatDateTime(event.starts_at)}
                          </Link>
                          <span className={cn("font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm", EVENT_STATUS_STYLES[event.linkStatus])}>
                            {EVENT_STATUS_LABELS[event.linkStatus]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-body text-xs italic text-ink-light mt-2">Sin evento próximo asignado todavía.</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
