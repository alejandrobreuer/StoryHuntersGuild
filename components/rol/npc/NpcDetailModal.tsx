"use client";

import * as React from "react";
import { Contact, X, ZoomIn, Images, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { labelForStanding, badgeClassForStanding } from "@/lib/rol/npcStandings";
import { oneOf, type NpcRow } from "@/lib/rol/npc";

interface GalleryImage {
  url:   string;
  label: string;
}

export function NpcPortrait({ npc, className }: { npc: NpcRow; className?: string }) {
  return npc.portrait_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
    <img src={npc.portrait_url} alt="" className={cn("object-cover", className)} />
  ) : (
    <div className={cn("flex items-center justify-center bg-brass/15", className)}>
      <Contact size={36} className="text-brass" />
    </div>
  );
}

// Full-screen, navigable across every image the NPC has (just portrait +
// full body for now — built to take more without changing shape later).
function NpcGalleryModal({ images, initialIndex, onClose }: { images: GalleryImage[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = React.useState(initialIndex);
  const hasMultiple = images.length > 1;

  const goPrev = React.useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const goNext = React.useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);

  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (hasMultiple && e.key === "ArrowLeft") goPrev();
      if (hasMultiple && e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goPrev, goNext, hasMultiple]);

  const current = images[index];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-ink/90 p-4" onClick={onClose}>
      <button onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 text-parchment hover:text-brass-bright transition-colors">
        <X size={28} />
      </button>

      <div className="relative flex items-center justify-center flex-1 w-full min-h-0" onClick={(e) => e.stopPropagation()}>
        {hasMultiple && (
          <button onClick={goPrev} aria-label="Imagen anterior" className="absolute left-0 sm:left-4 p-2 text-parchment hover:text-brass-bright transition-colors">
            <ChevronLeft size={32} />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element -- must render at its natural aspect ratio, full scale */}
        <img src={current.url} alt={current.label} className="max-w-full max-h-full object-contain shadow-parchment-lg" />
        {hasMultiple && (
          <button onClick={goNext} aria-label="Imagen siguiente" className="absolute right-0 sm:right-4 p-2 text-parchment hover:text-brass-bright transition-colors">
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      <p className="font-label text-xs uppercase tracking-widest text-parchment-dark mt-3">{current.label}</p>

      {hasMultiple && (
        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => setIndex(i)}
              aria-label={img.label}
              className={cn(
                "size-14 border-2 overflow-hidden transition-colors",
                i === index ? "border-brass" : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail strip */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NpcDetailModal({ npc, onClose }: { npc: NpcRow; onClose: () => void }) {
  const residence = oneOf(npc.residence);
  const origin = oneOf(npc.origin);
  const bodyImage = npc.full_body_url ?? npc.portrait_url;
  const images: GalleryImage[] = [
    ...(npc.portrait_url ? [{ url: npc.portrait_url, label: "Retrato" }] : []),
    ...(npc.full_body_url ? [{ url: npc.full_body_url, label: "Cuerpo completo" }] : []),
  ];
  const [galleryIndex, setGalleryIndex] = React.useState<number | null>(null);

  return (
    <Modal open onClose={onClose} title={npc.name} className="max-w-2xl">
      <div className="grid sm:grid-cols-[200px_1fr] gap-5">
        <div>
          {bodyImage ? (
            <button
              type="button"
              onClick={() => setGalleryIndex(images.findIndex((img) => img.url === bodyImage))}
              aria-label="Ver imagen en tamaño completo"
              className="group relative w-full shrink-0 overflow-hidden border border-brass/30 bg-parchment-dark/30 cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render; object-contain so nothing is cropped */}
              <img src={bodyImage} alt="" className="w-full h-auto max-h-96 object-contain transition-opacity group-hover:opacity-90" />
              <span className="absolute bottom-2 right-2 flex items-center justify-center size-8 rounded-full bg-ink/70 text-parchment opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn size={16} />
              </span>
            </button>
          ) : (
            <div className="relative w-full aspect-[3/4] shrink-0 border border-brass/30 bg-parchment-dark/30 flex items-center justify-center">
              <Contact size={40} className="text-leather-light" />
            </div>
          )}

          {images.length > 0 && (
            <Button type="button" size="sm" variant="ghost" className="w-full mt-2" onClick={() => setGalleryIndex(0)}>
              <Images size={14} className="mr-1.5" /> Ver galería
            </Button>
          )}
        </div>

        <div className="min-w-0">
          <span className={cn("inline-block font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm mb-2", badgeClassForStanding(npc.standing))}>
            {labelForStanding(npc.standing)}
          </span>

          <div className="font-body text-sm text-ink-light flex flex-col gap-0.5 mb-3">
            {origin && <p><span className="text-leather-light">Origen:</span> {origin.name}</p>}
            {residence && <p><span className="text-leather-light">Reside en:</span> {residence.name}</p>}
          </div>

          {(npc.factions.length > 0 || npc.tags.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {npc.factions.map((fl) => {
                const faction = oneOf(fl.faction);
                if (!faction) return null;
                return (
                  <span
                    key={faction.id}
                    className={cn(
                      "font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm",
                      fl.is_former ? "bg-border/40 text-ink-light" : "bg-moss/10 text-moss-dark"
                    )}
                  >
                    {fl.is_former ? `Ex-${faction.name}` : faction.name}
                  </span>
                );
              })}
              {npc.tags.map((tag) => (
                <span key={tag} className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/10 text-brass">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p className="font-body text-sm text-ink-light whitespace-pre-line">{npc.description}</p>
        </div>
      </div>

      {galleryIndex !== null && (
        <NpcGalleryModal images={images} initialIndex={galleryIndex} onClose={() => setGalleryIndex(null)} />
      )}
    </Modal>
  );
}
