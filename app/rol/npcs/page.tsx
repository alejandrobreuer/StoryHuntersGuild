"use client";

import * as React from "react";
import { Contact } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { labelForStanding, badgeClassForStanding } from "@/lib/rol/npcStandings";
import type { RolNpcStanding } from "@/types/database";

interface NpcRow {
  id:          string;
  name:        string;
  description: string;
  standing:    RolNpcStanding;
  residence:   { id: string; name: string } | { id: string; name: string }[] | null;
  faction:     { id: string; name: string } | { id: string; name: string }[] | null;
}

function oneOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default function RolNpcsPage() {
  const [npcs, setNpcs] = React.useState<NpcRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [residenceFilter, setResidenceFilter] = React.useState("");
  const [factionFilter, setFactionFilter] = React.useState("");

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
      const f = oneOf(n.faction);
      if (f) seen.set(f.id, f.name);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [npcs]);

  const filtered = npcs.filter((n) => {
    if (residenceFilter && oneOf(n.residence)?.id !== residenceFilter) return false;
    if (factionFilter && oneOf(n.faction)?.id !== factionFilter) return false;
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
            const faction = oneOf(n.faction);
            return (
              <div key={n.id} className="surface-parchment p-5">
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
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
                  {faction && (
                    <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-moss/10 text-moss-dark">
                      {faction.name}
                    </span>
                  )}
                </div>
                <p className="font-body text-sm text-ink-light">{n.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
