"use client";

import * as React from "react";
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { iconForLocationType, labelForLocationType, scaleForLocationType } from "@/lib/rol/locationTypes";
import type { ShgRolLocation, ShgRolMap } from "@/types/database";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function LocationMarker({ location, onSelect }: { location: ShgRolLocation; onSelect: () => void }) {
  const Icon = iconForLocationType(location.type);
  const scale = scaleForLocationType(location.type);
  const box = Math.round(56 * scale);
  const img = Math.round(44 * scale);
  const icon = Math.round(30 * scale);
  return (
    <button
      onClick={onSelect}
      className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 hover:scale-110 hover:z-20 transition-transform"
      style={{ left: `${location.x_pct}%`, top: `${location.y_pct}%` }}
    >
      <span className="pointer-events-none absolute left-1/2 bottom-full mb-1 -translate-x-1/2 whitespace-nowrap rounded-sm border border-brass/60 bg-[#1c1810] px-2 py-1 font-label text-2xs text-brass-bright opacity-0 shadow-parchment-lg transition-opacity duration-150 group-hover:opacity-100">
        {location.name}
      </span>
      <div className="relative flex items-center justify-center" style={{ width: box, height: box }}>
        {location.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
          <img src={location.icon_url} alt="" className="object-contain drop-shadow-lg" style={{ width: img, height: img }} />
        ) : (
          <Icon size={icon} className="text-crimson drop-shadow-lg" fill="currentColor" />
        )}
      </div>
    </button>
  );
}

function LocationPopup({ location, onClose }: { location: ShgRolLocation; onClose: () => void }) {
  return (
    <div
      className="absolute z-30 w-64 surface-parchment p-4 shadow-parchment-lg"
      style={{ left: `${location.x_pct}%`, top: `calc(${location.y_pct}% - 2.75rem)`, transform: "translate(-50%, -100%)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-2 right-2 text-ink-light hover:text-crimson transition-colors"
      >
        <X size={16} />
      </button>
      <p className="font-label text-2xs uppercase tracking-wide text-brass mb-1 pr-5">{labelForLocationType(location.type)}</p>
      <h2 className="font-display text-lg text-ink mb-1.5 pr-5">{location.name}</h2>
      <p className="font-body text-sm text-ink-light leading-snug">{location.description}</p>
      {/* little pointer tail, echoing the pin it belongs to */}
      <div className="absolute left-1/2 top-full -translate-x-1/2 h-2.5 w-2.5 rotate-45 -mt-1.5 surface-parchment border-r border-b border-border" />
    </div>
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
  // Captured right before a zoom-level change, so a layout effect can restore
  // the same map point under the cursor (or viewport center for the +/-
  // buttons) once the new zoom has been applied to the DOM.
  const zoomOriginRef = React.useRef<{ x: number; y: number; oldZoom: number; oldScrollLeft: number; oldScrollTop: number } | null>(null);

  React.useEffect(() => {
    fetch("/api/rol/map")
      .then((r) => r.json())
      .then((json) => {
        setMap(json.data?.map ?? null);
        setLocations(json.data?.locations ?? []);
        setLoading(false);
      });
  }, []);

  function zoomBy(delta: number, originX: number, originY: number) {
    const el = scrollRef.current;
    if (!el) return;
    setZoom((z) => {
      const next = clamp(z + delta, MIN_ZOOM, MAX_ZOOM);
      if (next !== z) {
        zoomOriginRef.current = { x: originX, y: originY, oldZoom: z, oldScrollLeft: el.scrollLeft, oldScrollTop: el.scrollTop };
      }
      return next;
    });
  }

  // Restores the map point that was under the zoom origin (cursor, or
  // viewport center for the toolbar buttons) so zooming feels anchored to
  // that point instead of always growing from the top-left corner.
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    const origin = zoomOriginRef.current;
    if (!el || !origin) return;
    const ratio = zoom / origin.oldZoom;
    el.scrollLeft = (origin.oldScrollLeft + origin.x) * ratio - origin.x;
    el.scrollTop = (origin.oldScrollTop + origin.y) * ratio - origin.y;
    zoomOriginRef.current = null;
  }, [zoom]);

  // Native listener with { passive: false } — React's onWheel is passive by
  // default, so e.preventDefault() inside it wouldn't actually stop the
  // container from also scrolling while the wheel zooms.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP, e.clientX - rect.left, e.clientY - rect.top);
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [map?.image_url]);

  function centerOrigin(): [number, number] {
    const el = scrollRef.current;
    if (!el) return [0, 0];
    return [el.clientWidth / 2, el.clientHeight / 2];
  }

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
    <main className="flex flex-col h-[calc(100vh-60px)] px-4 py-3">
      <div className="flex items-center gap-3 mb-2 shrink-0 flex-wrap">
        <h1 className="font-display text-xl text-parchment">Mapa del Mundo</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => zoomBy(-ZOOM_STEP, ...centerOrigin())}
            disabled={zoom <= MIN_ZOOM}
            className="p-1.5 border border-border text-parchment-dark hover:border-brass hover:text-brass transition-colors disabled:opacity-30"
            aria-label="Alejar"
          >
            <ZoomOut size={15} />
          </button>
          <span className="font-label text-2xs text-parchment-dark w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => zoomBy(ZOOM_STEP, ...centerOrigin())}
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
        </div>
        <span className="font-body text-2xs text-parchment-dark">
          Rueda del mouse para zoom · click derecho o botón central + arrastrar para mover el mapa
        </span>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : !map?.image_url ? (
        <p className="font-body italic text-parchment-dark">El mapa todavía no tiene una imagen cargada.</p>
      ) : (
        <div
          ref={scrollRef}
          onPointerDown={startPan}
          onContextMenu={(e) => e.preventDefault()}
          className={cn("relative flex-1 min-h-0 surface-parchment overflow-auto", panning && "cursor-grabbing")}
        >
          <div className="relative" style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- must render at its natural aspect ratio */}
            <img
              src={map.image_url}
              alt=""
              className="w-full h-auto block select-none"
              draggable={false}
              onClick={() => setSelected(null)}
            />
            {locations.map((l) => (
              <LocationMarker key={l.id} location={l} onSelect={() => setSelected(l)} />
            ))}
            {selected && <LocationPopup location={selected} onClose={() => setSelected(null)} />}
          </div>
        </div>
      )}
    </main>
  );
}
