"use client";

import * as React from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { iconForLocationType, labelForLocationType } from "@/lib/rol/locationTypes";
import type { ShgRolLocation, ShgRolMap } from "@/types/database";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function LocationMarker({ location, onSelect }: { location: ShgRolLocation; onSelect: () => void }) {
  const Icon = iconForLocationType(location.type);
  return (
    <button
      onClick={onSelect}
      title={location.name}
      className="absolute -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
      style={{ left: `${location.x_pct}%`, top: `${location.y_pct}%` }}
    >
      <div className="relative flex items-center justify-center w-14 h-14">
        {location.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
          <img src={location.icon_url} alt="" className="w-11 h-11 object-contain drop-shadow-lg" />
        ) : (
          <Icon size={30} className="text-crimson drop-shadow-lg" fill="currentColor" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed asset */}
        <img
          src="/images/dagger.png"
          alt=""
          className="absolute -top-5 left-[calc(50%+11px)] -translate-x-1/2 w-12 h-12 object-contain drop-shadow pointer-events-none"
        />
      </div>
    </button>
  );
}

export default function RolMapPage() {
  const [map, setMap] = React.useState<ShgRolMap | null>(null);
  const [locations, setLocations] = React.useState<ShgRolLocation[]>([]);
  const [selected, setSelected] = React.useState<ShgRolLocation | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [zoom, setZoom] = React.useState(1);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [panning, setPanning] = React.useState(false);
  const panStartRef = React.useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  React.useEffect(() => {
    fetch("/api/rol/map")
      .then((r) => r.json())
      .then((json) => {
        setMap(json.data?.map ?? null);
        setLocations(json.data?.locations ?? []);
        setLoading(false);
      });
  }, []);

  // Native listener with { passive: false } — React's onWheel is passive by
  // default, so e.preventDefault() inside it wouldn't actually stop the
  // container from also scrolling while the wheel zooms.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      setZoom((z) => clamp(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), MIN_ZOOM, MAX_ZOOM));
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [map?.image_url]);

  function startPan(e: React.PointerEvent) {
    if (e.button !== 1 && e.button !== 2) return;
    e.preventDefault();
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollRef.current?.scrollLeft ?? 0,
      scrollTop: scrollRef.current?.scrollTop ?? 0,
    };
    setPanning(true);
  }

  React.useEffect(() => {
    if (!panning) return;

    function handleMove(e: PointerEvent) {
      if (!scrollRef.current) return;
      const start = panStartRef.current;
      scrollRef.current.scrollLeft = start.scrollLeft - (e.clientX - start.x);
      scrollRef.current.scrollTop = start.scrollTop - (e.clientY - start.y);
    }
    function handleUp() {
      setPanning(false);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [panning]);

  return (
    <main className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment mb-8">Mapa del Mundo</h1>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : !map?.image_url ? (
        <p className="font-body italic text-parchment-dark">El mapa todavía no tiene una imagen cargada.</p>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setZoom((z) => clamp(z - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}
                disabled={zoom <= MIN_ZOOM}
                className="p-1.5 border border-border text-parchment-dark hover:border-brass hover:text-brass transition-colors disabled:opacity-30"
                aria-label="Alejar"
              >
                <ZoomOut size={15} />
              </button>
              <span className="font-label text-2xs text-parchment-dark w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => clamp(z + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}
                disabled={zoom >= MAX_ZOOM}
                className="p-1.5 border border-border text-parchment-dark hover:border-brass hover:text-brass transition-colors disabled:opacity-30"
                aria-label="Acercar"
              >
                <ZoomIn size={15} />
              </button>
              {zoom !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="p-1.5 border border-border text-parchment-dark hover:border-brass hover:text-brass transition-colors"
                  aria-label="Restablecer zoom"
                >
                  <RotateCcw size={15} />
                </button>
              )}
              <span className="font-body text-2xs text-parchment-dark">
                Rueda del mouse para zoom · click derecho o botón central + arrastrar para mover el mapa
              </span>
            </div>

            <div
              ref={scrollRef}
              onPointerDown={startPan}
              onContextMenu={(e) => e.preventDefault()}
              className={cn("relative surface-parchment overflow-auto", panning && "cursor-grabbing")}
              style={{ maxHeight: 560 }}
            >
              <div className={cn("relative")} style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- must render at its natural aspect ratio */}
                <img src={map.image_url} alt="" className="w-full h-auto block select-none" draggable={false} />
                {locations.map((l) => (
                  <LocationMarker key={l.id} location={l} onSelect={() => setSelected(l)} />
                ))}
              </div>
            </div>
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
