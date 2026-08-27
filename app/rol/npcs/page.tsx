"use client";

import * as React from "react";
import { Contact } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { labelForStanding, badgeClassForStanding } from "@/lib/rol/npcStandings";
import { oneOf, type NpcRow, type FactionRef } from "@/lib/rol/npc";
import { NpcPortrait, NpcDetailModal } from "@/components/rol/npc/NpcDetailModal";

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
    const seen = new Map<string, FactionRef>();
    for (const n of npcs) {
      for (const fl of n.factions) {
        const f = oneOf(fl.faction);
        if (f) seen.set(f.id, f);
      }
    }
    return Array.from(seen.values())
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .map((f) => [f.id, f.name] as const);
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

    const byFaction = new Map<string, { id: string; name: string; sort_order: number; npcs: NpcRow[] }>();
    const unaffiliated: NpcRow[] = [];

    for (const n of filtered) {
      const currentFactions = n.factions
        .filter((fl) => !fl.is_former)
        .map((fl) => oneOf(fl.faction))
        .filter((f): f is FactionRef => Boolean(f));

      if (currentFactions.length === 0) {
        unaffiliated.push(n);
        continue;
      }
      for (const f of currentFactions) {
        const group = byFaction.get(f.id) ?? { id: f.id, name: f.name, sort_order: f.sort_order, npcs: [] };
        group.npcs.push(n);
        byFaction.set(f.id, group);
      }
    }

    const sorted = Array.from(byFaction.values()).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    if (unaffiliated.length > 0) sorted.push({ id: "none", name: "Sin facción", sort_order: Infinity, npcs: unaffiliated });
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
