import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { unstable_noStore as noStore } from "next/cache";
import { AtSign, ExternalLink, Ticket, ScrollText, Radio } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/guard";
import { getFeatureFlags } from "@/lib/features";
import { EVENT_TYPE_LABELS } from "@/lib/gamification/eventTypes";
import { EventMissionBanner, type EventMissionData } from "@/components/events/EventMissionBanner";
import { QuestBoard, type IndividualMissionItem, type GroupMissionItem, type GroupInstance } from "@/components/events/QuestBoard";
import { Button } from "@/components/ui/Button";
import { formatARS, formatDateTime, formatTime } from "@/lib/formatting";
import type { ShgEvent, ShgVenuePublic, ShgGame, QuestDifficulty, QuestType, QuestEventStatus, QuestGroupStatus } from "@/types/database";

interface EventQuestRow {
  id: string; title: string; narrative: string | null; difficulty: QuestDifficulty; type: QuestType;
  reward_xp: number; reward_rp: number; max_completions_per_event: number;
  max_participants: number | null; required_turn_ins: number | null; status: string;
  badge: { name: string } | { name: string }[] | null;
  game: { name: string; image_url: string | null } | { name: string; image_url: string | null }[] | null;
}
interface EventQuestLinkRow {
  status: QuestEventStatus; closed_at: string | null;
  quest: EventQuestRow | EventQuestRow[] | null;
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
          .select(
            "status, closed_at, quest:shg_quests(id, title, narrative, difficulty, type, reward_xp, reward_rp, max_completions_per_event, max_participants, required_turn_ins, status, badge:shg_badges(name), game:shg_games(name, image_url))"
          )
          .eq("event_id", params.id)
      : Promise.resolve({ data: [] as EventQuestLinkRow[] }),
  ]);

  const remaining = remainingRow?.remaining ?? event.capacity;
  const games = (eventGames ?? []).map((r) => r.game).filter(Boolean) as unknown as ShgGame[];
  const venue = event.venue as unknown as ShgVenuePublic;
  const typedEvent = event as unknown as ShgEvent;

  const isLive = Boolean(typedEvent.started_at) && !typedEvent.ended_at;
  const hasEnded = Boolean(typedEvent.ended_at);
  const notStarted = !typedEvent.started_at;

  const allMissions = ((eventQuests ?? []) as EventQuestLinkRow[])
    .map((r) => {
      const q = one(r.quest);
      return q && q.status === "active" ? { ...q, linkStatus: r.status, linkClosedAt: r.closed_at } : null;
    })
    .filter((m): m is EventQuestRow & { linkStatus: QuestEventStatus; linkClosedAt: string | null } => Boolean(m));

  // An event has at most one Event-type mission (enforced when quest_ids are saved).
  const eventMission = allMissions.find((m) => m.type === "event") ?? null;
  const individualMissionRows = allMissions.filter((m) => m.type === "individual");
  const groupMissionRows = allMissions.filter((m) => m.type === "group");

  const allMissionIds = allMissions.map((m) => m.id);
  const usageByQuest = new Map<string, number>();
  if (allMissionIds.length > 0) {
    const { data: usageRows } = await admin
      .from("shg_quest_completions")
      .select("quest_id")
      .eq("event_id", params.id)
      .in("quest_id", allMissionIds);
    for (const row of usageRows ?? []) usageByQuest.set(row.quest_id, (usageByQuest.get(row.quest_id) ?? 0) + 1);
  }

  // Individual + Event missions track state via shg_quest_activations; Group
  // missions track it via shg_quest_groups/members instead (fetched below).
  // shg_quest_rewards is checked for every type — it's what "already
  // completed, grayed out" means regardless of how the mission works.
  const selfServiceMissionIds = [...individualMissionRows, ...(eventMission ? [eventMission] : [])].map((m) => m.id);
  const activationByQuest = new Map<string, "active" | "turned_in" | "rejected">();
  const rewardedQuestIds = new Set<string>();
  if (sessionUser) {
    const [{ data: activationRows }, { data: rewardRows }] = await Promise.all([
      selfServiceMissionIds.length > 0
        ? admin.from("shg_quest_activations").select("quest_id, status").eq("event_id", params.id).eq("user_id", sessionUser.id).in("quest_id", selfServiceMissionIds)
        : Promise.resolve({ data: [] as { quest_id: string; status: string }[] }),
      allMissionIds.length > 0
        ? admin.from("shg_quest_rewards").select("quest_id").eq("user_id", sessionUser.id).in("quest_id", allMissionIds)
        : Promise.resolve({ data: [] as { quest_id: string }[] }),
    ]);
    for (const row of activationRows ?? []) activationByQuest.set(row.quest_id, row.status as "active" | "turned_in" | "rejected");
    for (const row of rewardRows ?? []) rewardedQuestIds.add(row.quest_id);
  }

  let eventMissionData: EventMissionData | null = null;
  let eventMissionViewerTurnedIn = false;
  if (eventMission) {
    const { count } = await admin
      .from("shg_quest_activations")
      .select("id", { count: "exact", head: true })
      .eq("quest_id", eventMission.id).eq("event_id", params.id).eq("status", "turned_in");
    const badge = one(eventMission.badge);
    eventMissionData = {
      id: eventMission.id, title: eventMission.title, narrative: eventMission.narrative,
      rewardXp: eventMission.reward_xp, rewardRp: eventMission.reward_rp, badgeName: badge?.name ?? null,
      requiredTurnIns: eventMission.required_turn_ins ?? 0, turnedInCount: count ?? 0,
      linkStatus: eventMission.linkStatus,
    };
    eventMissionViewerTurnedIn = rewardedQuestIds.has(eventMission.id) || activationByQuest.get(eventMission.id) === "turned_in";
  }

  const individualMissionItems: IndividualMissionItem[] = individualMissionRows.map((m) => {
    const badge = one(m.badge);
    const game = one(m.game);
    const initialState = rewardedQuestIds.has(m.id) ? "completed" : activationByQuest.get(m.id) ?? "available";
    return {
      id: m.id, title: m.title, narrative: m.narrative, difficulty: m.difficulty,
      rewardXp: m.reward_xp, rewardRp: m.reward_rp, badgeName: badge?.name ?? null, game,
      maxPerEvent: m.max_completions_per_event, usedCount: usageByQuest.get(m.id) ?? 0, initialState,
    };
  });

  const groupMissionIds = groupMissionRows.map((m) => m.id);
  interface RawGroupMember { user_id: string; user: { id: string; email: string; name: string | null } | { id: string; email: string; name: string | null }[] | null }
  interface RawGroup { id: string; quest_id: string; status: QuestGroupStatus; members: RawGroupMember[] }
  const groupsByQuest = new Map<string, RawGroup[]>();
  if (groupMissionIds.length > 0) {
    const { data: groupRows } = await admin
      .from("shg_quest_groups")
      .select("id, quest_id, status, members:shg_quest_group_members(user_id, user:shg_users(id, email, name))")
      .eq("event_id", params.id)
      .in("quest_id", groupMissionIds)
      .in("status", ["forming", "started", "turned_in"]);
    for (const row of (groupRows ?? []) as unknown as RawGroup[]) {
      const list = groupsByQuest.get(row.quest_id) ?? [];
      list.push(row);
      groupsByQuest.set(row.quest_id, list);
    }
  }

  const groupMissionItems: GroupMissionItem[] = groupMissionRows.map((m) => {
    const badge = one(m.badge);
    const game = one(m.game);
    const rawGroups = groupsByQuest.get(m.id) ?? [];
    const groups: GroupInstance[] = rawGroups.map((g) => ({
      id: g.id,
      status: g.status,
      members: (g.members ?? []).map((mem) => {
        const u = one(mem.user);
        return { id: mem.user_id, label: u?.name || u?.email || "Aventurero" };
      }),
    }));
    const viewerGroupId = sessionUser
      ? groups.find((g) => g.members.some((mem) => mem.id === sessionUser.id))?.id ?? null
      : null;
    return {
      id: m.id, title: m.title, narrative: m.narrative, difficulty: m.difficulty,
      rewardXp: m.reward_xp, rewardRp: m.reward_rp, badgeName: badge?.name ?? null, game,
      maxParticipants: m.max_participants ?? 2, groups, viewerGroupId,
      viewerRewarded: rewardedQuestIds.has(m.id),
    };
  });

  const eyebrowDate = new Date(typedEvent.starts_at).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
  const schedule = typedEvent.ends_at
    ? `${formatTime(typedEvent.starts_at)} a ${formatTime(typedEvent.ends_at)} hs`
    : `${formatTime(typedEvent.starts_at)} hs`;

  const inactiveNote = notStarted ? "Se activa cuando el evento empiece" : "El evento ya finalizó";

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

        {eventMissionData && (
          <EventMissionBanner
            eventId={typedEvent.id}
            mission={eventMissionData}
            loggedIn={Boolean(sessionUser)}
            isLive={isLive}
            viewerTurnedIn={eventMissionViewerTurnedIn}
          />
        )}

        {(individualMissionItems.length > 0 || groupMissionItems.length > 0) && (
          <section className="mb-10">
            <p className="font-label text-xs uppercase tracking-widest text-brass mb-1">Misiones disponibles</p>
            <h2 className="font-display text-xl text-ink mb-2 flex items-center gap-2">
              <ScrollText size={18} className="text-crimson" /> Tablón de Misiones
            </h2>
            <p className="font-body text-sm text-ink-light mb-4">
              {isLive
                ? "Activá las que te interesen y jugalas durante el evento. Cuando la completes, avisale a un Asistente del Gremio."
                : hasEnded
                  ? "Así quedaron las misiones de este evento."
                  : "Se van a poder activar cuando el evento empiece."}
            </p>
            <div className="surface-wood rounded-md px-4 py-6 sm:px-7">
              <QuestBoard
                eventId={typedEvent.id}
                individualMissions={individualMissionItems}
                groupMissions={groupMissionItems}
                loggedIn={Boolean(sessionUser)}
                isLive={isLive}
                inactiveNote={inactiveNote}
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
