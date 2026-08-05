import Link from "next/link";
import Image from "next/image";
import { Dice5, Users, Clock } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { EventCard } from "@/components/events/EventCard";
import { formatPlayers, formatPlaytime } from "@/lib/formatting";
import type { ShgEventListItem, ShgGame } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [eventsResult, gamesResult] = await Promise.all([
    admin
      .from("shg_events")
      .select("*, venue:shg_venues(id, name, city)")
      .eq("status", "published")
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(3),
    admin
      .from("shg_games")
      .select("*")
      .eq("beginner_friendly", true)
      .order("name")
      .limit(6),
  ]);

  const rawEvents = eventsResult.data ?? [];
  const eventIds  = rawEvents.map((e) => e.id);
  const remainingMap = new Map<string, number>();
  if (eventIds.length > 0) {
    const { data: remainingRows } = await admin
      .from("shg_event_remaining")
      .select("event_id, remaining")
      .in("event_id", eventIds);
    for (const r of remainingRows ?? []) remainingMap.set(r.event_id, r.remaining);
  }
  const events = rawEvents.map((e) => ({ ...e, remaining: remainingMap.get(e.id) ?? e.capacity })) as unknown as ShgEventListItem[];
  const games  = (gamesResult.data ?? []) as ShgGame[];

  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-parchment to-parchment-dark text-center px-6 py-20 sm:py-28">
        <Image
          src="/images/crest.png"
          alt="Story Hunters Guild"
          width={220}
          height={220}
          className="mx-auto mb-6 object-contain drop-shadow-[0_10px_25px_rgba(74,52,35,0.3)]"
          priority
        />
        <h1 className="font-display text-3xl sm:text-5xl text-ink leading-tight max-w-2xl mx-auto text-balance">
          Juegos de mesa, gente nueva,{" "}
          <em className="not-italic">tardes que se hacen cortas.</em>
        </h1>
        <p className="font-body italic text-base sm:text-lg text-ink-light/70 max-w-lg mx-auto mt-5 mb-9">
          Sumate a nuestros eventos de juegos de mesa, conocé gente y descubrí tu próximo juego favorito — no hace falta experiencia previa.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild size="lg" variant="cta"><Link href="/events">Ver próximos eventos</Link></Button>
          <Button asChild size="lg" variant="ghost"><Link href="/games">Explorar ludoteca</Link></Button>
        </div>
      </section>

      {/* ── Upcoming events strip ────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-parchment to-parchment-dark px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl text-ink text-center mb-2">Próximos eventos</h2>
          <p className="font-body italic text-ink-light/70 text-center mb-10">Reservá tu lugar antes de que se llenen los cupos.</p>

          {events.length === 0 ? (
            <p className="font-body italic text-center text-leather-light py-10">
              Todavía no hay eventos publicados. Volvé pronto.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}

          <div className="text-center mt-10">
            <Button asChild variant="ghost"><Link href="/events">Ver todos los eventos →</Link></Button>
          </div>
        </div>
      </section>

      {/* ── Game library teaser ──────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-[#1c1810] to-[#261f13] px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl text-parchment text-center mb-2">Ideal para empezar</h2>
          <p className="font-body italic text-parchment-dark/70 text-center mb-10">Juegos fáciles de aprender, perfectos para tu primera vez.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {games.map((g) => (
              <div key={g.id} className="surface-parchment p-4 text-center transition-transform hover:-translate-y-1">
                <div className="relative w-full aspect-square mb-2 bg-parchment-dark/40 border border-brass/30 flex items-center justify-center overflow-hidden">
                  {g.image_url ? (
                    <Image src={g.image_url} alt={g.name} fill className="object-contain" sizes="150px" />
                  ) : (
                    <Dice5 size={28} className="text-leather-light" />
                  )}
                </div>
                <p className="font-label text-xs font-bold text-ink mb-1.5 line-clamp-2">{g.name}</p>
                <p className="flex items-center justify-center gap-1 text-2xs text-leather-light">
                  <Users size={11} /> {formatPlayers(g.min_players, g.max_players)}
                </p>
                <p className="flex items-center justify-center gap-1 text-2xs text-leather-light">
                  <Clock size={11} /> {formatPlaytime(g.playtime_minutes)}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button asChild variant="secondary"><Link href="/games">Ver toda la ludoteca →</Link></Button>
          </div>
        </div>
      </section>
    </main>
  );
}
