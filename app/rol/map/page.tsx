"use client";

import * as React from "react";
import Image from "next/image";
import { iconForLocationType, labelForLocationType } from "@/lib/rol/locationTypes";
import type { ShgRolLocation, ShgRolMap } from "@/types/database";

export default function RolMapPage() {
  const [map, setMap] = React.useState<ShgRolMap | null>(null);
  const [locations, setLocations] = React.useState<ShgRolLocation[]>([]);
  const [selected, setSelected] = React.useState<ShgRolLocation | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/rol/map")
      .then((r) => r.json())
      .then((json) => {
        setMap(json.data?.map ?? null);
        setLocations(json.data?.locations ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment mb-8">Mapa del Mundo</h1>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : !map?.image_url ? (
        <p className="font-body italic text-parchment-dark">El mapa todavía no tiene una imagen cargada.</p>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 relative aspect-video surface-parchment overflow-hidden">
            <Image src={map.image_url} alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" />
            {locations.map((l) => {
              const Icon = iconForLocationType(l.type);
              return (
                <button
                  key={l.id}
                  onClick={() => setSelected(l)}
                  title={l.name}
                  className="absolute -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
                  style={{ left: `${l.x_pct}%`, top: `${l.y_pct}%` }}
                >
                  <Icon size={24} className="text-crimson drop-shadow" fill="currentColor" />
                </button>
              );
            })}
          </div>

          <div className="surface-parchment p-5">
            {selected ? (
              <>
                <p className="font-label text-2xs uppercase tracking-wide text-brass mb-1">{labelForLocationType(selected.type)}</p>
                <h2 className="font-display text-xl text-ink mb-2">{selected.name}</h2>
                <p className="font-body text-sm text-ink-light">{selected.description}</p>
              </>
            ) : (
              <p className="font-body italic text-ink-light text-sm">Elegí un pin en el mapa para ver el detalle.</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
