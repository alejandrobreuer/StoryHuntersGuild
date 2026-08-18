"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Upload, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LOCATION_TYPES, iconForLocationType, labelForLocationType, type RolLocationType } from "@/lib/rol/locationTypes";
import type { ShgRolLocation, ShgRolMap } from "@/types/database";

const EMPTY = { name: "", type: "", description: "", x_pct: "50", y_pct: "50", discovered: false, icon_url: "" };
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

interface DragState {
  typeId: string;
  x: number;
  y: number;
}

function PaletteItem({ type, onPointerDownStart }: { type: RolLocationType; onPointerDownStart: (e: React.PointerEvent, typeId: string) => void }) {
  const Icon = type.icon;
  return (
    <div
      onPointerDown={(e) => onPointerDownStart(e, type.id)}
      className="flex flex-col items-center gap-1 border border-border bg-parchment/60 px-3 py-2 cursor-grab touch-none select-none transition-colors hover:border-brass active:cursor-grabbing"
    >
      <Icon size={18} className="text-ink" />
      <span className="font-label text-2xs uppercase tracking-wide text-ink-light">{type.label}</span>
    </div>
  );
}

function LocationPin({ location }: { location: ShgRolLocation }) {
  const Icon = iconForLocationType(location.type);
  return (
    <div
      title={location.name}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none",
        location.discovered ? "opacity-100" : "opacity-40"
      )}
      style={{ left: `${location.x_pct}%`, top: `${location.y_pct}%` }}
    >
      {location.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
        <img src={location.icon_url} alt="" className="w-8 h-8 object-contain drop-shadow" />
      ) : (
        <Icon size={20} className="text-crimson drop-shadow" fill="currentColor" />
      )}
    </div>
  );
}

export function LocationsManager() {
  const [map, setMap] = React.useState<ShgRolMap | null>(null);
  const [locations, setLocations] = React.useState<ShgRolLocation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [uploadingIcon, setUploadingIcon] = React.useState(false);
  const [editing, setEditing] = React.useState<ShgRolLocation | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);

  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [overMap, setOverMap] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [mapRes, locRes] = await Promise.all([
      fetch("/api/admin/rol/map"),
      fetch("/api/admin/rol/locations"),
    ]);
    const mapJson = await mapRes.json();
    const locJson = await locRes.json();
    setMap(mapJson.data ?? null);
    setLocations(locJson.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function pointInMap(x: number, y: number): boolean {
    if (!mapRef.current) return false;
    const rect = mapRef.current.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function startPaletteDrag(e: React.PointerEvent, typeId: string) {
    e.preventDefault();
    setDrag({ typeId, x: e.clientX, y: e.clientY });
  }

  // Plain pointer events instead of a drag-and-drop library: a small
  // floating preview follows the cursor from pointerdown on a palette chip
  // to pointerup, and release position decides the drop — no sensor
  // activation thresholds or drop-target collision detection to get wrong.
  React.useEffect(() => {
    if (!drag) return;

    function handleMove(e: PointerEvent) {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      setOverMap(pointInMap(e.clientX, e.clientY));
    }

    function handleUp(e: PointerEvent) {
      if (pointInMap(e.clientX, e.clientY) && mapRef.current && drag) {
        const rect = mapRef.current.getBoundingClientRect();
        const x_pct = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
        const y_pct = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
        setEditing(null);
        setForm({ ...EMPTY, type: drag.typeId, x_pct: x_pct.toFixed(1), y_pct: y_pct.toFixed(1) });
        setModalOpen(true);
      }
      setDrag(null);
      setOverMap(false);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-subscribes only on drag start/end, reads drag via closure intentionally
  }, [Boolean(drag)]);

  async function handleMapUpload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al subir imagen."); return; }
      const patchRes = await fetch("/api/admin/rol/map", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: json.data.url }),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok) { toast.error(patchJson.error ?? "Error al guardar el mapa."); return; }
      setMap(patchJson.data);
      toast.success("Mapa actualizado.");
    } finally {
      setUploading(false);
    }
  }

  async function handleIconUpload(file: File) {
    setUploadingIcon(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al subir imagen."); return; }
      setForm((f) => ({ ...f, icon_url: json.data.url }));
    } finally {
      setUploadingIcon(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(l: ShgRolLocation) {
    setEditing(l);
    setForm({
      name: l.name, type: l.type, description: l.description,
      x_pct: String(l.x_pct), y_pct: String(l.y_pct), discovered: l.discovered,
      icon_url: l.icon_url ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/rol/locations/${editing.id}` : "/api/admin/rol/locations", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          x_pct: Number(form.x_pct) || 0,
          y_pct: Number(form.y_pct) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Ubicación guardada.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleDiscovered(l: ShgRolLocation) {
    const res = await fetch(`/api/admin/rol/locations/${l.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discovered: !l.discovered }),
    });
    if (res.ok) load();
    else toast.error("No se pudo actualizar.");
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta ubicación?")) return;
    const res = await fetch(`/api/admin/rol/locations/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Ubicación eliminada."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  const FormIcon = iconForLocationType(form.type || "other");
  const DragIcon = drag ? iconForLocationType(drag.typeId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-parchment">Mapa del Mundo</h1>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nueva ubicación</Button>
      </div>

      <div className="surface-parchment p-5 mb-6">
        <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">Imagen del mapa</h2>

        {map?.image_url && (
          <>
            <div className="mb-3">
              <p className="font-label text-2xs uppercase tracking-wide text-ink-light mb-2">
                Arrastrá un tipo de ubicación sobre el mapa para crearla ahí
              </p>
              <div className="flex flex-wrap gap-2">
                {LOCATION_TYPES.map((t) => <PaletteItem key={t.id} type={t} onPointerDownStart={startPaletteDrag} />)}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setZoom((z) => clamp(z - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}
                disabled={zoom <= MIN_ZOOM}
                className="p-1.5 border border-border text-ink-light hover:border-brass hover:text-brass transition-colors disabled:opacity-30"
                aria-label="Alejar"
              >
                <ZoomOut size={15} />
              </button>
              <span className="font-label text-2xs text-ink-light w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => clamp(z + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}
                disabled={zoom >= MAX_ZOOM}
                className="p-1.5 border border-border text-ink-light hover:border-brass hover:text-brass transition-colors disabled:opacity-30"
                aria-label="Acercar"
              >
                <ZoomIn size={15} />
              </button>
              {zoom !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="p-1.5 border border-border text-ink-light hover:border-brass hover:text-brass transition-colors"
                  aria-label="Restablecer zoom"
                >
                  <RotateCcw size={15} />
                </button>
              )}
            </div>
          </>
        )}

        <div
          className={cn("relative w-full border overflow-auto mb-3 transition-colors", overMap ? "border-brass border-2" : "border-border")}
          style={{ maxHeight: 560 }}
        >
          {map?.image_url ? (
            <div ref={mapRef} className="relative" style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- must render at its natural aspect ratio; next/image needs known dimensions */}
              <img src={map.image_url} alt="" className="w-full h-auto block select-none" draggable={false} />
              {locations.map((l) => <LocationPin key={l.id} location={l} />)}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-leather-light font-body text-sm italic">Sin imagen todavía</div>
          )}
        </div>
        <label className="inline-flex items-center gap-2 border border-dashed border-border px-3 py-2.5 cursor-pointer hover:border-brass transition-colors text-sm font-body text-ink-light">
          <Upload size={15} />
          {uploading ? "Subiendo…" : "Subir / cambiar imagen del mapa"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleMapUpload(e.target.files[0])}
          />
        </label>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : locations.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay ubicaciones cargadas.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {locations.map((l) => (
            <div key={l.id} className={cn("surface-parchment p-4 flex items-center justify-between gap-3", !l.discovered && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-label text-sm font-bold text-ink">{l.name}</p>
                  <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                    {labelForLocationType(l.type)}
                  </span>
                </div>
                <p className="font-body text-xs text-ink-light truncate">{l.description}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleDiscovered(l)} className="p-1.5 text-leather-light hover:text-brass transition-colors" title={l.discovered ? "Marcar como no descubierta" : "Marcar como descubierta"}>
                  {l.discovered ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={() => openEdit(l)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(l.id)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar ubicación" : "Nueva ubicación"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Tipo" required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="" disabled>Elegí un tipo…</option>
            {LOCATION_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
          <Textarea label="Descripción" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Posición X (%)" type="number" min={0} max={100} value={form.x_pct} onChange={(e) => setForm({ ...form, x_pct: e.target.value })} />
            <Input label="Posición Y (%)" type="number" min={0} max={100} value={form.y_pct} onChange={(e) => setForm({ ...form, y_pct: e.target.value })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Ícono personalizado (opcional)</label>
            <p className="text-2xs text-ink-light font-body -mt-0.5">PNG con fondo transparente recomendado. Si no subís uno, se usa el ícono del tipo.</p>
            <div className="flex items-center gap-3">
              <div className="relative size-12 shrink-0 bg-parchment-dark/40 border border-brass/30 flex items-center justify-center overflow-hidden">
                {form.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
                  <img src={form.icon_url} alt="" className="w-full h-full object-contain" />
                ) : (
                  <FormIcon size={20} className="text-leather-light" />
                )}
              </div>
              <label className="flex items-center gap-2 border border-dashed border-border px-3 py-2 cursor-pointer hover:border-brass transition-colors text-xs font-body text-ink-light flex-1">
                <Upload size={14} />
                {uploadingIcon ? "Subiendo…" : form.icon_url ? "Cambiar ícono" : "Subir ícono"}
                <input
                  type="file"
                  accept="image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleIconUpload(e.target.files[0])}
                />
              </label>
              {form.icon_url && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, icon_url: "" }))} className="text-leather-light hover:text-crimson" aria-label="Quitar ícono">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.discovered} onChange={(e) => setForm({ ...form, discovered: e.target.checked })} className="accent-brass" />
            <span className={cn("font-label text-xs uppercase tracking-wide", form.discovered ? "text-moss" : "text-leather-light")}>
              {form.discovered ? "Descubierta" : "No descubierta"}
            </span>
          </label>
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>

      {drag && DragIcon && (
        <div
          className="fixed z-[999] pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center justify-center border-2 border-brass bg-parchment p-1.5 shadow-parchment-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          <DragIcon size={18} className="text-ink" />
        </div>
      )}
    </div>
  );
}
