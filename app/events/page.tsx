import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/features";
import { EventCard } from "@/components/events/EventCard";
import { EventFilters } from "@/components/events/EventFilters";
import type { ShgEventListItem } from "@/types/database";

export const metadata: Metadata = { title: "Eventos — Story Hunters Guild" };
export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { from?: string; venueId?: string; lifecycle?: string };
}) {
  noStore();
  const admin = createAdminClient();
  const features = await getFeatureFlags();

  let query = admin
    .from("shg_events")
    .select("*, venue:shg_venues(id, name, city)")
    .eq("status", "published")
    .order("starts_at", { ascending: true });

  // No filters selected → show everything. "Desde" only narrows the list
  // once explicitly set — but even then, a currently-live event stays
  // visible even if its scheduled start is before that date, so it never
  // drops out of the list mid-event.
  if (searchParams.from) {
    const fromIso = new Date(searchParams.from).toISOString();
    query = query.or(`starts_at.gte.${fromIso},and(started_at.not.is.null,ended_at.is.null)`);
  }
  if (searchParams.venueId) query = query.eq("venue_id", searchParams.venueId);
  if (searchParams.lifecycle === "pending") query = query.is("started_at", null);
  if (searchParams.lifecycle === "active") query = query.not("started_at", "is", null).is("ended_at", null);
  if (searchParams.lifecycle === "closed") query = query.not("ended_at", "is", null);

  const [{ data: rawEvents }, { data: venues }] = await Promise.all([
    query,
    admin.from("shg_venues").select("id, name").order("name"),
  ]);

  const events = rawEvents ?? [];
  const eventIds = events.map((e) => e.id);
  const remainingMap = new Map<string, number>();
  if (eventIds.length > 0) {
    const { data: remainingRows } = await admin
      .from("shg_event_remaining")
      .select("event_id, remaining")
      .in("event_id", eventIds);
    for (const r of remainingRows ?? []) remainingMap.set(r.event_id, r.remaining);
  }
  const enrichedEvents = events.map((e) => ({ ...e, remaining: remainingMap.get(e.id) ?? e.capacity })) as unknown as ShgEventListItem[];

  return (
    <main className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment text-center mb-2">Eventos</h1>
      <p className="font-body italic text-parchment-dark/70 text-center mb-8">Encontrá tu próxima aventura de mesa.</p>

      <EventFilters venues={venues ?? []} />

      {enrichedEvents.length === 0 ? (
        <p className="font-body italic text-center text-parchment-dark py-16">
          No hay eventos que coincidan con estos filtros.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrichedEvents.map((e) => <EventCard key={e.id} event={e} showRewards={features.event_rewards} />)}
        </div>
      )}
    </main>
  );
}
