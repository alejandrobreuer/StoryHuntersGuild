"use client";

import * as React from "react";
import { RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { iconForLocationType, labelForLocationType, scaleForLocationType } from "@/lib/rol/locationTypes";
import type { ShgRolLocation, ShgRolMap } from "@/types/database";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

// Extra clearance above/below the pin's own drawn box so the popup (or its
// pointer tail) never overlaps the icon it belongs to.
const POPUP_CLEARANCE_PX = 44;

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

/**
 * Anchored to its pin in the same percentage coordinate space as the
 * markers (so it pans/zooms with the map for free), but flips between
 * appearing above vs. below the pin depending on which side actually has
 * room for it in the container's *currently visible* (scrolled) area —
 * otherwise a popup near the top of the map, or a long description, could
 * render partly outside the scrollable viewport and get clipped.
 */
function LocationPopup({
  location, containerRef, imgRef, onClose,
}: {
  location: ShgRolLocation;
  containerRef: React.RefObject<HTMLDivElement>;
  imgRef: React.RefObject<HTMLImageElement>;
  onClose: () => void;
}) {
  const popupRef = React.useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = React.useState<"above" | "below">("above");

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    const popup = popupRef.current;
    if (!container || !img || !popup) return;
    const pinScreenY = (location.y_pct / 100) * img.clientHeight - container.scrollTop;
    const roomAbove = pinScreenY - POPUP_CLEARANCE_PX;
    const roomBelow = container.clientHeight - pinScreenY - POPUP_CLEARANCE_PX;
    setPlacement(roomAbove >= popup.offsetHeight || roomAbove >= roomBelow ? "above" : "below");
  }, [location, containerRef, imgRef]);

  const above = placement === "above";

  return (
    <div
      ref={popupRef}
      className="absolute z-30 w-64 surface-parchment p-4 shadow-parchment-lg"
      style={{
        left: `${location.x_pct}%`,
        top: `calc(${location.y_pct}% ${above ? "-" : "+"} ${POPUP_CLEARANCE_PX / 16}rem)`,
        transform: `translate(-50%, ${above ? "-100%" : "0"})`,
      }}
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
      {/* pointer tail: points down at the pin below when above it, up when below it */}
      {above ? (
        <div className="absolute left-1/2 top-full -translate-x-1/2 h-2.5 w-2.5 rotate-45 -mt-1.5 surface-parchment border-r border-b border-border" />
      ) : (
        <div className="absolute left-1/2 bottom-full -translate-x-1/2 h-2.5 w-2.5 rotate-45 -mb-1.5 surface-parchment border-l border-t border-border" />
      )}
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
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const [panning, setPanning] = React.useState(false);
  const panStartRef = React.useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  // Captured right before a zoom-level change, so a layout effect can restore
  // the same map point under the cursor once the new zoom has been applied
  // to the DOM.
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

  // Restores the map point that was under the cursor so zooming feels
  // anchored to that point instead of always growing from the top-left.
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
    <main className="relative h-[calc(100vh-60px)] w-full">
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <p className="font-body italic text-parchment-dark">Cargando…</p>
        </div>
      ) : !map?.image_url ? (
        <div className="flex h-full items-center justify-center">
          <p className="font-body italic text-parchment-dark">El mapa todavía no tiene una imagen cargada.</p>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            onPointerDown={startPan}
            onContextMenu={(e) => e.preventDefault()}
            className={cn("absolute inset-0 overflow-auto surface-parchment", panning && "cursor-grabbing")}
          >
            <div className="relative" style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- must render at its natural aspect ratio */}
              <img
                ref={imgRef}
                src={map.image_url}
                alt=""
                className="w-full h-auto block select-none"
                draggable={false}
                onClick={() => setSelected(null)}
              />
              {locations.map((l) => (
                <LocationMarker key={l.id} location={l} onSelect={() => setSelected(l)} />
              ))}
              {selected && (
                <LocationPopup location={selected} containerRef={scrollRef} imgRef={imgRef} onClose={() => setSelected(null)} />
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute top-3 left-3 z-20">
            <div className="pointer-events-auto surface-parchment px-3.5 py-2 shadow-parchment-lg">
              <h1 className="font-display text-lg text-ink">Mapa del Mundo</h1>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 right-3 z-20">
            <div className="pointer-events-auto flex items-center gap-2.5 surface-parchment px-3 py-1.5 shadow-parchment-lg">
              <span className="hidden sm:inline font-body text-2xs text-ink-light">
                Rueda para zoom · clic derecho + arrastrar para mover
              </span>
              <span className="font-label text-2xs text-ink-light border-l border-border pl-2.5">{Math.round(zoom * 100)}%</span>
              {zoom !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="text-ink-light hover:text-brass transition-colors"
                  aria-label="Restablecer zoom"
                  title="Restablecer zoom"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
