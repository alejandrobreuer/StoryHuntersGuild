"use client";

import * as React from "react";
import { Contact, X, ZoomIn } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { labelForStanding, badgeClassForStanding } from "@/lib/rol/npcStandings";
import type { RolNpcStanding } from "@/types/database";

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

function NpcDetailModal({ npc, onClose }: { npc: NpcRow; onClose: () => void }) {
  const residence = oneOf(npc.residence);
  const origin = oneOf(npc.origin);
  const bodyImage = npc.full_body_url ?? npc.portrait_url;
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  React.useEffect(() => {
    if (!lightboxOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen]);

  return (
    <Modal open onClose={onClose} title={npc.name} className="max-w-2xl">
      <div className="grid sm:grid-cols-[200px_1fr] gap-5">
        {bodyImage ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
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

        <div className="min-w-0">
          <span className={cn("inline-block font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm mb-2", badgeClassForStanding(npc.standing))}>
            {labelForStanding(npc.standing)}
          </span>

          <div className="font-body text-sm text-ink-light flex flex-col gap-0.5 mb-3">
            {origin && <p><span className="text-leather-light">Origen:</span> {origin.name}</p>}
            {residence && <p><span className="text-leather-light">Reside en:</span> {residence.name}</p>}
          </div>

          {npc.factions.length > 0 && (
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
            </div>
          )}

          <p className="font-body text-sm text-ink-light whitespace-pre-line">{npc.description}</p>
        </div>
      </div>

      {lightboxOpen && bodyImage && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 text-parchment hover:text-brass-bright transition-colors"
          >
            <X size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- must render at its natural aspect ratio, full scale */}
          <img
            src={bodyImage}
            alt=""
            className="max-w-full max-h-full object-contain shadow-parchment-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
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

  const filtered = npcs.filter((n) => {
    if (residenceFilter && oneOf(n.residence)?.id !== residenceFilter) return false;
    if (factionFilter && !n.factions.some((fl) => oneOf(fl.faction)?.id === factionFilter)) return false;
    return true;
  });

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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Contact size={28} className="mx-auto text-parchment-dark/60 mb-3" />
          <p className="font-body italic text-parchment-dark">
            {npcs.length === 0 ? "Todavía no hay NPCs cargados." : "Ningún NPC coincide con esos filtros."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((n) => {
            const residence = oneOf(n.residence);
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(n)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(n); } }}
                className="surface-parchment p-5 text-left cursor-pointer hover:shadow-parchment-lg transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <NpcPortrait npc={n} className="size-24 shrink-0 rounded-full border border-brass/30" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <p className="font-label text-base font-bold text-ink">{n.name}</p>
                      <span className={cn("font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm", badgeClassForStanding(n.standing))}>
                        {labelForStanding(n.standing)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {residence && (
                        <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                          {residence.name}
                        </span>
                      )}
                      {n.factions.map((fl) => {
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
                    </div>
                  </div>
                </div>
                <p className="font-body text-sm text-ink-light line-clamp-4">{n.description}</p>
                <p className="font-label text-2xs uppercase tracking-widest text-brass mt-1">Mostrar más…</p>
              </div>
            );
          })}
        </div>
      )}

      {selected && <NpcDetailModal npc={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
