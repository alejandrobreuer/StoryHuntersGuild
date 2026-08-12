import Link from "next/link";
import Image from "next/image";
import { MapPin, Radio } from "lucide-react";
import { formatARS, formatDateTime } from "@/lib/formatting";
import { EVENT_TYPE_LABELS } from "@/lib/gamification/eventTypes";
import { CapacityBadge } from "@/components/ui/CapacityBadge";
import { cn } from "@/lib/utils";
import type { ShgEventListItem } from "@/types/database";

interface EventCardProps {
  event: ShgEventListItem;
  /** Show the event-type label and RP reward — gated by the event_rewards feature flag. */
  showRewards?: boolean;
}

/** "Bounty posting" event card — the signature UI motif: torn-parchment
 * edges + a pinned-notice feel, capacity shown as a crosshair-seal badge. */
export function EventCard({ event, showRewards }: EventCardProps) {
  const isLive = Boolean(event.started_at) && !event.ended_at;

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "group relative block no-underline torn-edge pin-dot surface-parchment p-5 transition-transform duration-200 hover:-rotate-1 hover:shadow-parchment-lg",
        isLive && "ring-2 ring-crimson shadow-glow"
      )}
    >
      {isLive && (
        <span className="absolute -top-2.5 left-4 z-10 inline-flex items-center gap-1 font-label text-2xs uppercase tracking-widest px-2.5 py-1 rounded-full bg-crimson text-crimson-foreground shadow-parchment">
          <Radio size={11} className="animate-pulse" /> En vivo ahora
        </span>
      )}

      {event.cover_image_url && (
        <div className="relative w-full aspect-[16/9] mb-4 overflow-hidden border border-border">
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
        <CapacityBadge remaining={event.remaining} />
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="font-label text-2xs uppercase tracking-widest text-leather-light">Por persona</span>
        <span className="font-display text-lg font-semibold text-brass">
          {formatARS(event.price_per_person)}
        </span>
      </div>
    </Link>
  );
}
