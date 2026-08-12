import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { unstable_noStore as noStore } from "next/cache";
import { AtSign, ExternalLink, Ticket, ScrollText, Radio } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/guard";
import { getFeatureFlags } from "@/lib/features";
import { EVENT_TYPE_LABELS } from "@/lib/gamification/eventTypes";
import { EventMissionGrid, type MissionItem } from "@/components/events/EventMissionGrid";
import { Button } from "@/components/ui/Button";
import { formatARS, formatDateTime, formatTime } from "@/lib/formatting";
import type { ShgEvent, ShgVenuePublic, ShgGame, QuestDifficulty, QuestType } from "@/types/database";

interface EventQuestRow {
  id: string; title: string; narrative: string | null; difficulty: QuestDifficulty; type: QuestType;
  reward_xp: number; reward_rp: number; goal_count: number | null; max_completions_per_event: number; status: string;
  badge: { name: string } | { name: string }[] | null;
  game: { name: string; image_url: string | null } | { name: string; image_url: string | null }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data } = await admin.from("shg_events").select("title").eq("id", params.id).single();
  return { title: data ? `${data.title} — Story Hunters Guild` : "Story Hunters Guild" };
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  noStore();
  const admin = createAdminClient();
  const features = await getFeatureFlags();
  const sessionUser = await getSessionUser();

  const { data: event } = await admin
    .from("shg_events")
    .select("*, venue:shg_venues(id, name, address, city, map_url, instagram_url, logo_url, created_at, updated_at)")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();

  if (!event) notFound();

  const [{ data: remainingRow }, { data: eventGames }, { data: eventQuests }] = await Promise.all([
    admin.from("shg_event_remaining").select("remaining").eq("event_id", params.id).maybeSingle(),
    admin.from("shg_event_games").select("game:shg_games(*)").eq("event_id", params.id),
    features.quests
      ? admin
          .from("shg_quest_events")
          .select("quest:shg_quests(id, title, narrative, difficulty, type, reward_xp, reward_rp, goal_count, max_completions_per_event, status, badge:shg_badges(name), game:shg_games(name, image_url))")
          .eq("event_id", params.id)
      : Promise.resolve({ data: [] }),
  ]);

  const remaining = remainingRow?.remaining ?? event.capacity;
  const games = (eventGames ?? []).map((r) => r.game).filter(Boolean) as unknown as ShgGame[];
  const venue = event.venue as unknown as ShgVenuePublic;
  const typedEvent = event as unknown as ShgEvent;

  const isLive = Boolean(typedEvent.started_at) && !typedEvent.ended_at;
  const hasEnded = Boolean(typedEvent.ended_at);
  const notStarted = !typedEvent.started_at;

  const allMissions = ((eventQuests ?? []).map((r) => one(r.quest)).filter(Boolean) as unknown as EventQuestRow[])
    .filter((q) => q.status === "active");
  const communityMissions = allMissions.filter((q) => q.type === "community");
  const otherMissions = allMissions.filter((q) => q.type !== "community");

  const missionIds = allMissions.map((m) => m.id);
  const usageByQuest = new Map<string, number>();
  if (missionIds.length > 0) {
    const { data: usageRows } = await admin
      .from("shg_quest_completions")
      .select("quest_id")
      .eq("event_id", params.id)
      .in("quest_id", missionIds);
    for (const row of usageRows ?? []) usageByQuest.set(row.quest_id, (usageByQuest.get(row.quest_id) ?? 0) + 1);
  }

  const otherMissionIds = otherMissions.map((m) => m.id);
  const activationByQuest = new Map<string, "active" | "turned_in">();
  const rewardedQuestIds = new Set<string>();
  if (sessionUser && otherMissionIds.length > 0) {
    const [{ data: activationRows }, { data: rewardRows }] = await Promise.all([
      admin.from("shg_quest_activations").select("quest_id, status").eq("event_id", params.id).eq("user_id", sessionUser.id).in("quest_id", otherMissionIds),
      admin.from("shg_quest_rewards").select("quest_id").eq("user_id", sessionUser.id).in("quest_id", otherMissionIds),
    ]);
    for (const row of activationRows ?? []) activationByQuest.set(row.quest_id, row.status);
    for (const row of rewardRows ?? []) rewardedQuestIds.add(row.quest_id);
  }

  const missionGridItems: MissionItem[] = otherMissions.map((m) => {
    const badge = one(m.badge);
    const game = one(m.game);
    const initialState = rewardedQuestIds.has(m.id) ? "completed" : activationByQuest.get(m.id) ?? "available";
    return {
      id: m.id, title: m.title, narrative: m.narrative, difficulty: m.difficulty,
      rewardXp: m.reward_xp, rewardRp: m.reward_rp, badgeName: badge?.name ?? null, game,
      maxPerEvent: m.max_completions_per_event, usedCount: usageByQuest.get(m.id) ?? 0, initialState,
    };
  });

  const eyebrowDate = new Date(typedEvent.starts_at).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
  const schedule = typedEvent.ends_at
    ? `${formatTime(typedEvent.starts_at)} a ${formatTime(typedEvent.ends_at)} hs`
    : `${formatTime(typedEvent.starts_at)} hs`;

  return (
    <main className="bg-gradient-to-b from-parchment to-parchment-dark px-6 py-14">
      <div className="max-w-3xl mx-auto">
        {typedEvent.cover_image_url && (
          <div className="relative w-full aspect-[16/7] mb-8 overflow-hidden border border-brass/30 rounded-md">
            <Image src={typedEvent.cover_image_url} alt="" fill className="object-cover" sizes="800px" />
          </div>
        )}

        {/* ————— Hero ————— */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
            <span className="font-label text-xs uppercase tracking-[0.14em] text-brass">
              Evento · {eyebrowDate}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1 font-label text-2xs uppercase tracking-widest px-2.5 py-1 rounded-full bg-crimson text-crimson-foreground">
                <Radio size={11} className="animate-pulse" /> En vivo ahora
              </span>
            )}
            {hasEnded && (
              <span className="font-label text-2xs uppercase tracking-widest px-2.5 py-1 rounded-full bg-leather/15 text-leather">
                Finalizado
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-ink leading-tight mb-3">{typedEvent.title}</h1>

          {typedEvent.description && (
            <p className="font-body text-base text-ink-light max-w-xl mx-auto leading-relaxed mb-5">
              {typedEvent.description}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1.5 font-label text-xs uppercase tracking-wide text-ink-light">
            <span>Sede: <b className="text-ink font-semibold">{venue.name}{venue.city ? `, ${venue.city}` : ""}</b></span>
            <span>Horario: <b className="text-ink font-semibold">{schedule}</b></span>
            {games.length > 0 && (
              <span>Juegos destacados: <b className="text-ink font-semibold">{games.map((g) => g.name).join(", ")}</b></span>
            )}
          </div>

          {(venue.map_url || venue.instagram_url) && (
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 mt-2">
              {venue.map_url && (
                <a href={venue.map_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-label uppercase tracking-widest text-ink-light hover:text-crimson transition-colors">
                  <ExternalLink size={12} /> Ver en el mapa
                </a>
              )}
              {venue.instagram_url && (
                <a href={venue.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-label uppercase tracking-widest text-ink-light hover:text-crimson transition-colors">
                  <AtSign size={12} /> Instagram
                </a>
              )}
            </div>
          )}

          {features.event_rewards && (typedEvent.event_type || typedEvent.reward_rp > 0) && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {typedEvent.event_type && (
                <span className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-brass/15 text-brass">
                  {EVENT_TYPE_LABELS[typedEvent.event_type]}
                </span>
              )}
              {typedEvent.reward_rp > 0 && (
                <span className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-moss/15 text-moss-dark">
                  +{typedEvent.reward_rp} RP por asistir
                </span>
              )}
            </div>
          )}

          {notStarted && (
            <div className="inline-flex items-center gap-2 mt-5 border border-brass rounded-full px-4 py-1.5 font-label text-xs uppercase tracking-wide text-crimson bg-white/50">
              <Ticket size={14} /> {remaining} / {typedEvent.capacity} cupos disponibles
            </div>
          )}
        </div>

        {notStarted && (
          <div className="border border-brass/40 bg-white/40 rounded-md p-5 flex items-center justify-between flex-wrap gap-4 mb-10">
            <div>
              <p className="font-label text-2xs uppercase tracking-widest text-leather-light">Precio por persona</p>
              <p className="font-display text-2xl font-semibold text-brass">{formatARS(typedEvent.price_per_person)}</p>
            </div>
            {remaining > 0 ? (
              <Button asChild size="lg"><Link href={`/events/${typedEvent.id}/book`}>Reservar un lugar</Link></Button>
            ) : (
              <Button size="lg" disabled>Sin cupo</Button>
            )}
          </div>
        )}

        {communityMissions.map((m) => {
          const badge = one(m.badge);
          const total = usageByQuest.get(m.id) ?? 0;
          return (
            <section key={m.id} className="mb-10">
              <p className="font-label text-xs uppercase tracking-widest text-brass mb-1">Misión del evento</p>
              <div className="border border-brass rounded-md bg-white/50 p-6">
                <p className="font-display text-xl text-ink mb-1">{m.title}</p>
                {m.narrative && <p className="font-body text-sm text-ink-light leading-relaxed mb-4">{m.narrative}</p>}
                <div className="flex items-center justify-between font-label text-2xs uppercase tracking-widest text-leather-light mb-1">
                  <span>Ofrendas del gremio</span>
                  <span><b className="text-crimson text-sm">{total}</b> / {m.goal_count ?? "—"}</span>
                </div>
                <div className="h-3.5 w-full bg-parchment-dark/40 rounded-full overflow-hidden border border-brass/30">
                  <div
                    className="h-full bg-gradient-to-r from-brass to-crimson transition-all"
                    style={{ width: `${m.goal_count ? Math.min(100, (total / m.goal_count) * 100) : 0}%` }}
                  />
                </div>
                <p className="font-label text-2xs text-brass mt-3">
                  +{m.reward_rp} RP para todos los que contribuyan{badge ? ` · insignia "${badge.name}"` : ""}
                </p>
              </div>
            </section>
          );
        })}

        {otherMissions.length > 0 && (
          <section className="mb-10">
            <p className="font-label text-xs uppercase tracking-widest text-brass mb-1">Misiones disponibles</p>
            <h2 className="font-display text-xl text-ink mb-2 flex items-center gap-2">
              <ScrollText size={18} className="text-crimson" /> Tablón de misiones del evento
            </h2>
            <p className="font-body text-sm text-ink-light mb-4">
              {isLive
                ? "Activá las que te interesen y jugalas durante el evento. Cuando la completes, avisale a un Asistente del Gremio."
                : hasEnded
                  ? "Así quedaron las misiones de este evento."
                  : "Se van a poder activar cuando el evento empiece."}
            </p>
            <EventMissionGrid
              eventId={typedEvent.id}
              missions={missionGridItems}
              loggedIn={Boolean(sessionUser)}
              isLive={isLive}
              inactiveNote={notStarted ? "Se activa cuando el evento empiece" : "El evento ya finalizó"}
            />
          </section>
        )}
      </div>
    </main>
  );
}
