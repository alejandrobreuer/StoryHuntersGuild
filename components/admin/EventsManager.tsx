"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { formatARS, formatDateTime } from "@/lib/formatting";
import { toast } from "sonner";
import type { ShgGame, EventStatus } from "@/types/database";

interface EventRow {
  id: string; title: string; starts_at: string; capacity: number;
  price_per_person: number; status: EventStatus; venue: { id: string; name: string } | null;
}

interface VenueOption { id: string; name: string; }

const EMPTY = {
  title: "", description: "", venue_id: "", starts_at: "", ends_at: "",
  capacity: 10, price_per_person: 0, status: "draft" as EventStatus,
  cover_image_url: "", game_ids: [] as string[],
};

export function EventsManager() {
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [venues, setVenues] = React.useState<VenueOption[]>([]);
  const [games, setGames]   = React.useState<ShgGame[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [eventsRes, venuesRes, gamesRes] = await Promise.all([
      fetch("/api/admin/events"), fetch("/api/admin/venues"), fetch("/api/admin/games"),
    ]);
    setEvents((await eventsRes.json()).data ?? []);
    setVenues((await venuesRes.json()).data ?? []);
    setGames((await gamesRes.json()).data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  async function openEdit(id: string) {
    const res = await fetch(`/api/admin/events/${id}`);
    const json = await res.json();
    const e = json.data;
    setEditingId(id);
    setForm({
      title: e.title, description: e.description ?? "", venue_id: e.venue_id,
      starts_at: e.starts_at ? e.starts_at.slice(0, 16) : "",
      ends_at: e.ends_at ? e.ends_at.slice(0, 16) : "",
      capacity: e.capacity, price_per_person: e.price_per_person, status: e.status,
      cover_image_url: e.cover_image_url ?? "", game_ids: e.game_ids ?? [],
    });
    setModalOpen(true);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al subir imagen."); return; }
      setForm((f) => ({ ...f, cover_image_url: json.data.url }));
    } finally {
      setUploading(false);
    }
  }

  function toggleGame(id: string) {
    setForm((f) => ({
      ...f,
      game_ids: f.game_ids.includes(id) ? f.game_ids.filter((g) => g !== id) : [...f.game_ids, id],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        capacity: Number(form.capacity),
        price_per_person: Number(form.price_per_person),
      };
      const res = await fetch(editingId ? `/api/admin/events/${editingId}` : "/api/admin/events", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Evento guardado.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este evento? Esto también elimina sus reservas.")) return;
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Evento eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Eventos</h1>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo evento</Button>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((e) => (
            <div key={e.id} className="surface-parchment p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-label text-sm font-bold text-ink">{e.title}</p>
                  <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">{e.status}</span>
                </div>
                <p className="font-body text-xs text-ink-light">
                  {formatDateTime(e.starts_at)} · {e.venue?.name ?? "—"} · {formatARS(e.price_per_person)}/persona · cupo {e.capacity}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(e.id)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(e.id)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Editar evento" : "Nuevo evento"} className="max-w-xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Título" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Descripción" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <Select label="Lugar" required value={form.venue_id} onChange={(e) => setForm({ ...form, venue_id: e.target.value })}>
            <option value="">Elegí un lugar…</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Inicio" type="datetime-local" required value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            <Input label="Fin (opcional)" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Cupo" type="number" min={1} required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            <Input label="Precio/persona" type="number" min={0} required value={form.price_per_person} onChange={(e) => setForm({ ...form, price_per_person: Number(e.target.value) })} />
            <Select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}>
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Imagen de portada</label>
            <label className="flex items-center gap-2 border border-dashed border-border px-3 py-2.5 cursor-pointer hover:border-brass transition-colors text-sm font-body text-ink-light">
              <Upload size={15} />
              {uploading ? "Subiendo…" : form.cover_image_url ? "Cambiar imagen" : "Subir imagen"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Juegos destacados</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border border-border p-2 bg-parchment/40">
              {games.map((g) => (
                <button
                  key={g.id} type="button" onClick={() => toggleGame(g.id)}
                  className={`font-label text-2xs px-2.5 py-1 border rounded-sm transition-colors ${
                    form.game_ids.includes(g.id) ? "bg-moss text-parchment border-moss" : "border-border text-ink-light hover:border-brass"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
