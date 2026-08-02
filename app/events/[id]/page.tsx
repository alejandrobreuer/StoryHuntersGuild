import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Users, Clock, Dice5 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { CapacityBadge } from "@/components/ui/CapacityBadge";
import { formatARS, formatDateTime, formatPlayers, formatPlaytime } from "@/lib/formatting";
import type { ShgEvent, ShgVenuePublic, ShgGame } from "@/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data } = await admin.from("shg_events").select("title").eq("id", params.id).single();
  return { title: data ? `${data.title} — Story Hunters Guild` : "Story Hunters Guild" };
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("shg_events")
    .select("*, venue:shg_venues(id, name, address, city, map_url, created_at, updated_at)")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();

  if (!event) notFound();

  const [{ data: remainingRow }, { data: eventGames }] = await Promise.all([
    admin.from("shg_event_remaining").select("remaining").eq("event_id", params.id).maybeSingle(),
    admin.from("shg_event_games").select("game:shg_games(*)").eq("event_id", params.id),
  ]);

  const remaining = remainingRow?.remaining ?? event.capacity;
  const games = (eventGames ?? []).map((r) => r.game).filter(Boolean) as unknown as ShgGame[];
  const venue = event.venue as unknown as ShgVenuePublic;
  const typedEvent = event as unknown as ShgEvent;

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
        <p className="font-display text-lg text-ink">{venue.name}</p>
        <p className="font-body text-sm text-ink-light">{venue.address}{venue.city ? `, ${venue.city}` : ""}</p>
        {venue.map_url && (
          <a href={venue.map_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs font-label uppercase tracking-widest">
            Ver en el mapa →
          </a>
        )}
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
