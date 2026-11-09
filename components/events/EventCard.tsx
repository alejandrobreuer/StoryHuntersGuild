import Link from "next/link";
import Image from "next/image";
import { MapPin, Radio, ArrowRight, Ticket } from "lucide-react";
import { formatARS, formatDateTime } from "@/lib/formatting";
import { EVENT_TYPE_LABELS } from "@/lib/gamification/eventTypes";
import { CapacityBadge, AttendedBadge } from "@/components/ui/CapacityBadge";
import { cn } from "@/lib/utils";
import type { ShgEventListItem } from "@/types/database";
import { EVENT_COVER_ASPECT } from "@/components/events/cover";

interface EventCardProps {
  event: ShgEventListItem;
  /** Show the event-type label and RP reward — gated by the event_rewards feature flag. */
  showRewards?: boolean;
  /** Remaining spots at or below this show "Disponibilidad baja" (admin setting). */
  lowAvailabilityThreshold: number;
}

/** "Bounty posting" event card — the signature UI motif: torn-parchment
 * edges + a pinned-notice feel, capacity shown as a crosshair-seal badge. */
export function EventCard({ event, showRewards, lowAvailabilityThreshold }: EventCardProps) {
  const isLive = Boolean(event.started_at) && !event.ended_at;
  const isFinished = Boolean(event.ended_at);
  const isUpcoming = !isLive && !isFinished;
  const isFull = event.remaining <= 0;
  const isLow = !isFull && event.remaining <= lowAvailabilityThreshold;

  return (
    // The badge lives in this outer, unclipped wrapper — torn-edge's
    // clip-path on the Link below would otherwise slice off anything
    // positioned outside the card via a negative offset, badge included.
    <div className={cn("relative", isLive && "pt-3")}>
      {isLive && (
        <span className="absolute top-0 left-4 z-10 inline-flex items-center gap-1 font-label text-2xs uppercase tracking-widest px-2.5 py-1 rounded-full bg-crimson text-crimson-foreground shadow-parchment">
          <Radio size={11} className="animate-pulse" /> En vivo ahora
        </span>
      )}
      <Link
        href={`/events/${event.id}`}
        className={cn(
          "group relative block no-underline torn-edge pin-dot surface-parchment p-5 transition-transform duration-200",
          isFinished ? "opacity-60 grayscale hover:opacity-80" : "hover:-rotate-1 hover:shadow-parchment-lg",
          isLive && "ring-2 ring-crimson shadow-glow"
        )}
      >
      {event.cover_image_url && (
        <div className={`relative w-full ${EVENT_COVER_ASPECT} mb-4 overflow-hidden border border-border`}>
          <Image src={event.cover_image_url} alt="" fill className="object-cover" sizes="400px" />
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-label text-2xs uppercase tracking-widest text-crimson mb-1">
            {formatDateTime(event.starts_at)}
          </p>
          <h3 className="font-display text-lg text-ink leading-snug mb-1.5 group-hover:text-crimson transition-colors">
            {event.title}
          </h3>
          <p className="flex items-center gap-1.5 font-body text-sm text-ink-light italic">
            <MapPin size={13} className="shrink-0 text-leather-light" />
            {event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ""}
          </p>
          {isUpcoming && isLow && (
            <span className="inline-flex items-center gap-1.5 mt-2 border border-brass rounded-full px-2.5 py-0.5 font-label text-2xs uppercase tracking-wide text-crimson bg-white/50">
              <Ticket size={11} /> Disponibilidad baja
            </span>
          )}
          {showRewards && (event.event_type || event.reward_rp > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {event.event_type && (
                <span className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-brass/15 text-brass">
                  {EVENT_TYPE_LABELS[event.event_type]}
                </span>
              )}
              {event.reward_rp > 0 && (
                <span className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-moss/15 text-moss-dark">
                  +{event.reward_rp} RP
                </span>
              )}
            </div>
          )}
        </div>
        {isFinished ? (
          <AttendedBadge count={event.attended_count ?? 0} />
        ) : (
          isUpcoming && isFull && <CapacityBadge remaining={0} />
        )}
      </div>

      {isLive ? (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest px-4 py-2 rounded-sm bg-crimson text-crimson-foreground group-hover:bg-crimson/90 transition-colors">
            Ver evento <ArrowRight size={13} />
          </span>
        </div>
      ) : isFinished ? (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-center">
          <span className="font-label text-sm uppercase tracking-widest text-leather-light">Finalizado</span>
        </div>
      ) : (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <span className="font-label text-2xs uppercase tracking-widest text-leather-light">Por persona</span>
          <span className="font-display text-lg font-semibold text-brass">
            {formatARS(event.price_per_person)}
          </span>
        </div>
      )}
      </Link>
    </div>
  );
}
