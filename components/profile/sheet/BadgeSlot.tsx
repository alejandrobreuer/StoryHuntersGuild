import Image from "next/image";

/** What a badge slot needs. Kept minimal so a badge catalog (locked badges,
 * how to earn them) can plug in later. */
export interface SheetBadge {
  id:          string;
  name:        string;
  description: string | null;
  /** Uploaded art; falls back to `icon` (emoji/short label). */
  iconUrl:     string | null;
  icon:        string | null;
}

/** One cell of the badge grid: a gold medallion, or an empty dashed circle. */
export function BadgeSlot({ badge }: { badge: SheetBadge | null }) {
  if (!badge) {
    return (
      <div aria-hidden className="flex justify-center">
        <div className="size-14 sm:size-16 rounded-full border-[1.5px] border-dashed border-parchment-deep bg-brass/5" />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5 text-center min-w-0">
      <div className="relative size-14 sm:size-16 rounded-full overflow-hidden bg-gradient-to-br from-brass-light to-brass border-2 border-brass-dark shadow-[inset_0_0_0_3px_rgba(239,228,204,0.55)] flex items-center justify-center">
        {badge.iconUrl ? (
          <Image src={badge.iconUrl} alt="" fill className="object-cover" sizes="64px" />
        ) : (
          <span className="text-2xl" aria-hidden>{badge.icon || "🏅"}</span>
        )}
      </div>
      <p className="font-display text-[10px] font-semibold tracking-wide leading-tight text-ink-heading">{badge.name}</p>
      {badge.description && (
        <p className="font-body text-xs italic leading-tight text-ink-light line-clamp-2">{badge.description}</p>
      )}
    </div>
  );
}
