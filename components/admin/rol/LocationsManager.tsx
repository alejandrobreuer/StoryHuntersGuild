"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, Upload, Eye, EyeOff, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ShgRolLocation, ShgRolMap } from "@/types/database";

const EMPTY = { name: "", type: "", description: "", x_pct: "50", y_pct: "50", discovered: false };

export function LocationsManager() {
  const [map, setMap] = React.useState<ShgRolMap | null>(null);
  const [locations, setLocations] = React.useState<ShgRolLocation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [editing, setEditing] = React.useState<ShgRolLocation | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-parchment">Mapa del Mundo</h1>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nueva ubicación</Button>
      </div>

      <div className="surface-parchment p-5 mb-6">
        <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">Imagen del mapa</h2>
        <div className="relative w-full aspect-video bg-parchment-dark/40 border border-border overflow-hidden mb-3">
          {map?.image_url ? (
            <>
              <Image src={map.image_url} alt="" fill className="object-cover" sizes="100vw" />
              {locations.map((l) => (
                <div
                  key={l.id}
                  title={l.name}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center",
                    l.discovered ? "opacity-100" : "opacity-40"
                  )}
                  style={{ left: `${l.x_pct}%`, top: `${l.y_pct}%` }}
                >
                  <MapPin size={20} className="text-crimson drop-shadow" fill="currentColor" />
                </div>
              ))}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-leather-light font-body text-sm italic">Sin imagen todavía</div>
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
                  <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">{l.type}</span>
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
          <Input label="Tipo" required placeholder="pueblo, fortaleza, ruina…" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <Textarea label="Descripción" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Posición X (%)" type="number" min={0} max={100} value={form.x_pct} onChange={(e) => setForm({ ...form, x_pct: e.target.value })} />
            <Input label="Posición Y (%)" type="number" min={0} max={100} value={form.y_pct} onChange={(e) => setForm({ ...form, y_pct: e.target.value })} />
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
    </div>
  );
}
