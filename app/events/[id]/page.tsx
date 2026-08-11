import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { unstable_noStore as noStore } from "next/cache";
import { MapPin, Users, Clock, Dice5, AtSign, ScrollText } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/features";
import { EVENT_TYPE_LABELS } from "@/lib/gamification/eventTypes";
import { DIFFICULTY_LABELS } from "@/lib/gamification/questDifficulty";
import { Button } from "@/components/ui/Button";
import { CapacityBadge } from "@/components/ui/CapacityBadge";
import { formatARS, formatDateTime, formatPlayers, formatPlaytime } from "@/lib/formatting";
import type { ShgEvent, ShgVenuePublic, ShgGame, QuestDifficulty } from "@/types/database";

interface EventQuestRow {
  id: string; title: string; narrative: string | null; difficulty: QuestDifficulty;
  reward_xp: number; reward_rp: number; max_completions_per_event: number;
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
          .select("quest:shg_quests(id, title, narrative, difficulty, reward_xp, reward_rp, max_completions_per_event, status, badge:shg_badges(name), game:shg_games(name, image_url))")
          .eq("event_id", params.id)
      : Promise.resolve({ data: [] }),
  ]);

  const remaining = remainingRow?.remaining ?? event.capacity;
  const games = (eventGames ?? []).map((r) => r.game).filter(Boolean) as unknown as ShgGame[];
  const venue = event.venue as unknown as ShgVenuePublic;
  const typedEvent = event as unknown as ShgEvent;

  const missions = ((eventQuests ?? []).map((r) => one(r.quest)).filter(Boolean) as unknown as (EventQuestRow & { status: string })[])
    .filter((q) => q.status === "active");

  const missionIds = missions.map((m) => m.id);
  const usageByQuest = new Map<string, number>();
  if (missionIds.length > 0) {
    const { data: usageRows } = await admin
      .from("shg_quest_completions")
      .select("quest_id")
      .eq("event_id", params.id)
      .in("quest_id", missionIds);
    for (const row of usageRows ?? []) usageByQuest.set(row.quest_id, (usageByQuest.get(row.quest_id) ?? 0) + 1);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-14">
      {typedEvent.cover_image_url && (
        <div className="relative w-full aspect-[16/7] mb-8 overflow-hidden border border-brass/30">
          <Image src={typedEvent.cover_image_url} alt="" fill className="object-cover" sizes="800px" />
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="font-label text-xs uppercase tracking-widest text-crimson mb-2">
            {formatDateTime(typedEvent.starts_at)}
          </p>
          <h1 className="font-display text-3xl text-parchment leading-snug">{typedEvent.title}</h1>
          {features.event_rewards && (typedEvent.event_type || typedEvent.reward_rp > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
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
        </div>
        <CapacityBadge remaining={remaining} className="shrink-0" />
      </div>

      {typedEvent.description && (
        <p className="font-body text-base text-parchment-dark/90 leading-relaxed mb-8">{typedEvent.description}</p>
      )}

      {/* Venue inline — no standalone venue page */}
      <div className="surface-parchment p-5 mb-6">
        <h2 className="font-label text-xs uppercase tracking-widest text-leather-light mb-2 flex items-center gap-1.5">
          <MapPin size={14} /> Lugar
        </h2>
        <div className="flex items-start gap-3">
          {venue.logo_url && (
            <div className="relative size-12 shrink-0 bg-parchment-dark/40 border border-brass/30 overflow-hidden">
              <Image src={venue.logo_url} alt="" fill className="object-contain" sizes="48px" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display text-lg text-ink">{venue.name}</p>
            <p className="font-body text-sm text-ink-light">{venue.address}{venue.city ? `, ${venue.city}` : ""}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
          {venue.map_url && (
            <a href={venue.map_url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-label uppercase tracking-widest">
              Ver en el mapa →
            </a>
          )}
          {venue.instagram_url && (
            <a
              href={venue.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-label uppercase tracking-widest"
            >
              <AtSign size={13} /> Instagram
            </a>
          )}
        </div>
      </div>

      {games.length > 0 && (
        <div className="surface-parchment p-5 mb-6">
          <h2 className="font-label text-xs uppercase tracking-widest text-leather-light mb-3 flex items-center gap-1.5">
            <Dice5 size={14} /> Juegos destacados
          </h2>
          <div className="flex flex-wrap gap-3">
            {games.map((g) => (
              <div key={g.id} className="flex items-center gap-2 border border-border px-3 py-2 bg-parchment/50">
                <span className="font-label text-sm font-semibold text-ink">{g.name}</span>
                <span className="text-2xs text-leather-light flex items-center gap-1"><Users size={11} />{formatPlayers(g.min_players, g.max_players)}</span>
                <span className="text-2xs text-leather-light flex items-center gap-1"><Clock size={11} />{formatPlaytime(g.playtime_minutes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {missions.length > 0 && (
        <div className="surface-parchment p-5 mb-6">
          <h2 className="font-label text-xs uppercase tracking-widest text-leather-light mb-3 flex items-center gap-1.5">
            <ScrollText size={14} /> Misiones disponibles
          </h2>
          <div className="flex flex-col gap-3">
            {missions.map((m) => {
              const badge = one(m.badge);
              const game = one(m.game);
              const used = usageByQuest.get(m.id) ?? 0;
              const soldOut = m.max_completions_per_event > 0 && used >= m.max_completions_per_event;
              return (
                <div key={m.id} className={`border border-border px-3.5 py-3 bg-parchment/50 ${soldOut ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="font-label text-sm font-semibold text-ink">{m.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                        {DIFFICULTY_LABELS[m.difficulty]}
                      </span>
                      {soldOut && (
                        <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-crimson/15 text-crimson">
                          Cupo agotado
                        </span>
                      )}
                    </div>
                  </div>
                  {m.narrative && <p className="font-body text-sm text-ink-light mt-1 leading-relaxed">{m.narrative}</p>}
                  <div className="flex items-center gap-3 flex-wrap mt-2">
                    <span className="font-label text-2xs text-brass">
                      +{m.reward_xp} XP · +{m.reward_rp} RP{badge ? ` · insignia "${badge.name}"` : ""}
                    </span>
                    {game && (
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="surface-parchment p-5 flex items-center justify-between flex-wrap gap-4">
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
    </main>
  );
}
