"use client";

import * as React from "react";
import { Contact, X, ZoomIn, Images, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { labelForStanding, badgeClassForStanding } from "@/lib/rol/npcStandings";
import type { RolNpcStanding } from "@/types/database";

interface GalleryImage {
  url:   string;
  label: string;
}

interface NpcFactionLink {
  is_former: boolean;
  faction:   { id: string; name: string } | { id: string; name: string }[] | null;
}

interface NpcRow {
  id:             string;
  name:           string;
  description:    string;
  standing:       RolNpcStanding;
  portrait_url:   string | null;
  full_body_url:  string | null;
  residence:      { id: string; name: string } | { id: string; name: string }[] | null;
  origin:         { id: string; name: string } | { id: string; name: string }[] | null;
  factions:       NpcFactionLink[];
  tags:           string[];
}

function oneOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function NpcPortrait({ npc, className }: { npc: NpcRow; className?: string }) {
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

function NpcCard({ npc, onSelect }: { npc: NpcRow; onSelect: () => void }) {
  const residence = oneOf(npc.residence);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      className="surface-parchment p-5 text-left cursor-pointer hover:shadow-parchment-lg transition-shadow"
    >
      <div className="flex items-start gap-3">
        <NpcPortrait npc={npc} className="size-24 shrink-0 rounded-full border border-brass/30" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <p className="font-label text-base font-bold text-ink">{npc.name}</p>
            <span className={cn("font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm", badgeClassForStanding(npc.standing))}>
              {labelForStanding(npc.standing)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {residence && (
              <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                {residence.name}
              </span>
            )}
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
        </div>
      </div>
      <p className="font-body text-sm text-ink-light line-clamp-4">{npc.description}</p>
      <p className="font-label text-2xs uppercase tracking-widest text-brass mt-1">Mostrar más…</p>
    </div>
  );
}

function NpcDetailModal({ npc, onClose }: { npc: NpcRow; onClose: () => void }) {
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

export default function RolNpcsPage() {
  const [npcs, setNpcs] = React.useState<NpcRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [residenceFilter, setResidenceFilter] = React.useState("");
  const [factionFilter, setFactionFilter] = React.useState("");
  const [selected, setSelected] = React.useState<NpcRow | null>(null);

  React.useEffect(() => {
    fetch("/api/rol/npcs")
      .then((r) => r.json())
      .then((json) => {
        setNpcs(json.data ?? []);
        setLoading(false);
      });
  }, []);

  const residences = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const n of npcs) {
      const r = oneOf(n.residence);
      if (r) seen.set(r.id, r.name);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [npcs]);

  const factions = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const n of npcs) {
      for (const fl of n.factions) {
        const f = oneOf(fl.faction);
        if (f) seen.set(f.id, f.name);
      }
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [npcs]);

  // One section per current faction (an NPC with several shows up in each);
  // former ("Ex-") memberships don't count toward grouping. NPCs with no
  // current faction land in a trailing "Sin facción" section.
  const groups = React.useMemo(() => {
    const filtered = npcs.filter((n) => {
      if (residenceFilter && oneOf(n.residence)?.id !== residenceFilter) return false;
      if (factionFilter && !n.factions.some((fl) => oneOf(fl.faction)?.id === factionFilter)) return false;
      return true;
    });

    const byFaction = new Map<string, { id: string; name: string; npcs: NpcRow[] }>();
    const unaffiliated: NpcRow[] = [];

    for (const n of filtered) {
      const currentFactions = n.factions
        .filter((fl) => !fl.is_former)
        .map((fl) => oneOf(fl.faction))
        .filter((f): f is { id: string; name: string } => Boolean(f));

      if (currentFactions.length === 0) {
        unaffiliated.push(n);
        continue;
      }
      for (const f of currentFactions) {
        const group = byFaction.get(f.id) ?? { id: f.id, name: f.name, npcs: [] };
        group.npcs.push(n);
        byFaction.set(f.id, group);
      }
    }

    const sorted = Array.from(byFaction.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (unaffiliated.length > 0) sorted.push({ id: "none", name: "Sin facción", npcs: unaffiliated });
    return sorted;
  }, [npcs, residenceFilter, factionFilter]);

  const totalShown = groups.reduce((sum, g) => sum + g.npcs.length, 0);

  return (
    <main className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment mb-8">NPCs del Mundo</h1>

      <div className="surface-parchment p-4 mb-8 grid sm:grid-cols-2 gap-3">
        <Select label="Residencia" value={residenceFilter} onChange={(e) => setResidenceFilter(e.target.value)}>
          <option value="">Todas</option>
          {residences.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </Select>
        <Select label="Facción" value={factionFilter} onChange={(e) => setFactionFilter(e.target.value)}>
          <option value="">Todas</option>
          {factions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </Select>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : totalShown === 0 ? (
        <div className="text-center py-16">
          <Contact size={28} className="mx-auto text-parchment-dark/60 mb-3" />
          <p className="font-body italic text-parchment-dark">
            {npcs.length === 0 ? "Todavía no hay NPCs cargados." : "Ningún NPC coincide con esos filtros."}
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.id} className="mb-10">
            <h2 className="font-display text-xl text-parchment mb-4 pb-2 border-b border-brass/20">{group.name}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {group.npcs.map((n) => <NpcCard key={n.id} npc={n} onSelect={() => setSelected(n)} />)}
            </div>
          </section>
        ))
      )}

      {selected && <NpcDetailModal npc={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
