import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { formatARS, formatDateTime } from "@/lib/formatting";
import { CapacityBadge } from "@/components/ui/CapacityBadge";
import type { ShgEventListItem } from "@/types/database";

interface EventCardProps {
  event: ShgEventListItem;
}

/** "Bounty posting" event card — the signature UI motif: torn-parchment
 * edges + a pinned-notice feel, capacity shown as a crosshair-seal badge. */
export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group relative block no-underline torn-edge pin-dot surface-parchment p-5 transition-transform duration-200 hover:-rotate-1 hover:shadow-parchment-lg"
    >
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
