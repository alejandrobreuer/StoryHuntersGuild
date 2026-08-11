"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, Upload, Eye, Receipt, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FieldStatus } from "@/components/admin/FieldStatus";
import { formatARS, formatDateTime } from "@/lib/formatting";
import { EVENT_TYPE_LABELS } from "@/lib/gamification/eventTypes";
import { toast } from "sonner";
import type { ShgGame, EventStatus, EventType, ShgBookingWithEvent } from "@/types/database";

interface EventRow {
  id: string; title: string; slug: string; description: string | null;
  starts_at: string; ends_at: string | null; capacity: number;
  price_per_person: number; currency: string; status: EventStatus;
  cover_image_url: string | null; venue: { id: string; name: string } | null;
  game_ids: string[]; quest_ids: string[]; event_type: EventType | null; reward_rp: number;
}

interface EventDetail {
  id: string; title: string; description: string | null;
  starts_at: string; ends_at: string | null; capacity: number;
  price_per_person: number; status: EventStatus; cover_image_url: string | null;
  venue: { id: string; name: string } | null; game_ids: string[]; quest_ids: string[];
  event_type: EventType | null; reward_rp: number;
}

interface VenueOption { id: string; name: string; }
interface QuestOption { id: string; title: string; type: string; }

const EMPTY = {
  title: "", description: "", venue_id: "", starts_at: "", ends_at: "",
  capacity: 10, price_per_person: 0, status: "draft" as EventStatus,
  cover_image_url: "", game_ids: [] as string[], quest_ids: [] as string[],
  event_type: "" as EventType | "", reward_rp: 0,
};

export function EventsManager() {
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [venues, setVenues] = React.useState<VenueOption[]>([]);
  const [games, setGames]   = React.useState<ShgGame[]>([]);
  const [quests, setQuests] = React.useState<QuestOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const [viewOpen, setViewOpen] = React.useState(false);
  const [loadingView, setLoadingView] = React.useState(false);
  const [viewingEvent, setViewingEvent] = React.useState<EventDetail | null>(null);
  const [eventBookings, setEventBookings] = React.useState<ShgBookingWithEvent[]>([]);
  const [attendanceBusyId, setAttendanceBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [eventsRes, venuesRes, gamesRes, questsRes] = await Promise.all([
      fetch("/api/admin/events"), fetch("/api/admin/venues"), fetch("/api/admin/games"), fetch("/api/admin/quests"),
    ]);
    setEvents((await eventsRes.json()).data ?? []);
    setVenues((await venuesRes.json()).data ?? []);
    setGames((await gamesRes.json()).data ?? []);
    setQuests((await questsRes.json()).data ?? []);
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
      cover_image_url: e.cover_image_url ?? "", game_ids: e.game_ids ?? [], quest_ids: e.quest_ids ?? [],
      event_type: e.event_type ?? "", reward_rp: e.reward_rp ?? 0,
    });
    setModalOpen(true);
  }

  async function openView(id: string) {
    setViewingEvent(null);
    setEventBookings([]);
    setViewOpen(true);
    setLoadingView(true);
    try {
      const [eventRes, bookingsRes] = await Promise.all([
        fetch(`/api/admin/events/${id}`),
        fetch(`/api/admin/bookings?eventId=${id}`),
      ]);
      const eventJson = await eventRes.json();
      const bookingsJson = await bookingsRes.json();
      setViewingEvent(eventJson.data ?? null);
      setEventBookings(bookingsJson.data ?? []);
    } finally {
      setLoadingView(false);
    }
  }

  async function toggleAttendance(bookingId: string, attended: boolean) {
    setAttendanceBusyId(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attended }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo actualizar."); return; }
      setEventBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, attended } : b)));
    } finally {
      setAttendanceBusyId(null);
    }
  }

  async function viewReceipt(id: string) {
    const res = await fetch(`/api/admin/bookings/${id}/receipt-url`);
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Sin comprobante."); return; }
    window.open(json.data.url, "_blank", "noopener,noreferrer");
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

  function toggleQuest(id: string) {
    setForm((f) => ({
      ...f,
      quest_ids: f.quest_ids.includes(id) ? f.quest_ids.filter((q) => q !== id) : [...f.quest_ids, id],
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
        event_type: form.event_type || null,
        reward_rp: Number(form.reward_rp),
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
      ) : events.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay eventos cargados.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {events.map((e) => (
            <div key={e.id} className="surface-parchment p-4 flex flex-col gap-2.5">
              {e.cover_image_url ? (
                <div className="relative w-full aspect-[16/9] overflow-hidden border border-border">
                  <Image src={e.cover_image_url} alt="" fill className="object-cover" sizes="360px" />
                </div>
              ) : (
                <div className="w-full aspect-[16/9] bg-parchment-dark/40 border border-border flex flex-col items-center justify-center gap-1">
                  <ImageOff size={18} className="text-leather-light" />
                  <FieldStatus ok={false}>Sin portada</FieldStatus>
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-label text-sm font-bold text-ink">{e.title}</p>
                    <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">{e.status}</span>
                    {e.event_type && (
                      <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/15 text-brass">
                        {EVENT_TYPE_LABELS[e.event_type]}
                      </span>
                    )}
                  </div>
                  <p className="font-body text-2xs text-ink-light/70 truncate">/{e.slug}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openView(e.id)} className="p-1.5 text-leather-light hover:text-moss-dark transition-colors" title="Ver detalle"><Eye size={15} /></button>
                  <button onClick={() => openEdit(e.id)} className="p-1.5 text-leather-light hover:text-brass transition-colors" title="Editar"><Edit2 size={15} /></button>
                  <button onClick={() => handleDelete(e.id)} className="p-1.5 text-leather-light hover:text-crimson transition-colors" title="Eliminar"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="font-body text-xs text-ink-light flex flex-col gap-1">
                <p>{formatDateTime(e.starts_at)}</p>
                <div className="flex items-center gap-1.5">
                  <FieldStatus ok={e.ends_at ? null : false}>Fin</FieldStatus>
                  {e.ends_at && <span>{formatDateTime(e.ends_at)}</span>}
                </div>
                <p>{e.venue?.name ?? "—"} · cupo {e.capacity} · {formatARS(e.price_per_person)}/persona ({e.currency})</p>
                {e.reward_rp > 0 && <p className="text-brass">+{e.reward_rp} RP por asistir</p>}
              </div>

              <div>
                <FieldStatus ok={e.description ? null : false}>Descripción</FieldStatus>
                {e.description && <p className="font-body text-xs text-ink-light line-clamp-2 mt-0.5">{e.description}</p>}
              </div>

              <div>
                <FieldStatus ok={e.game_ids.length > 0 ? null : false}>Juegos destacados</FieldStatus>
                {e.game_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {e.game_ids.map((gid) => {
                      const g = games.find((game) => game.id === gid);
                      return g ? (
                        <span key={gid} className="font-label text-2xs px-2 py-0.5 rounded-sm bg-leather/10 text-leather">{g.name}</span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <div>
                <FieldStatus ok={e.quest_ids.length > 0 ? null : false}>Misiones asignadas</FieldStatus>
                {e.quest_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {e.quest_ids.map((qid) => {
                      const q = quests.find((quest) => quest.id === qid);
                      return q ? (
                        <span key={qid} className="font-label text-2xs px-2 py-0.5 rounded-sm bg-brass/10 text-brass">{q.title}</span>
                      ) : null;
                    })}
                  </div>
                )}
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

          <div className="grid grid-cols-2 gap-3 items-end">
            <Select
              label="Tipo de evento (opcional)"
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value as EventType | "" })}
            >
              <option value="">Ninguno</option>
              {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
                <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
              ))}
            </Select>
            <Input
              label="RP por asistir"
              type="number"
              min={0}
              value={form.reward_rp}
              onChange={(e) => setForm({ ...form, reward_rp: Number(e.target.value) })}
              helperText="Guía: partida corta (<30min) 1 RP, media (30-60min) 2 RP, larga (>60min) 3 RP."
            />
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

          <div className="flex flex-col gap-1.5">
            <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Misiones disponibles</label>
            <p className="font-body text-2xs text-ink-light -mt-1">Elegí qué misiones del panel de Misiones están disponibles para este evento.</p>
            {quests.length === 0 ? (
              <p className="font-body text-xs italic text-ink-light">Todavía no hay misiones cargadas.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border border-border p-2 bg-parchment/40">
                {quests.map((q) => (
                  <button
                    key={q.id} type="button" onClick={() => toggleQuest(q.id)}
                    className={`font-label text-2xs px-2.5 py-1 border rounded-sm transition-colors ${
                      form.quest_ids.includes(q.id) ? "bg-brass text-ink border-brass" : "border-border text-ink-light hover:border-brass"
                    }`}
                  >
                    {q.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>

      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title={viewingEvent?.title ?? "Evento"}
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        {loadingView ? (
          <p className="font-body italic text-ink-light">Cargando…</p>
        ) : viewingEvent && (
          <div className="flex flex-col gap-5">
            {viewingEvent.cover_image_url && (
              <div className="relative w-full aspect-[16/7] overflow-hidden border border-brass/30">
                <Image src={viewingEvent.cover_image_url} alt="" fill className="object-cover" sizes="600px" />
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-leather/10 text-leather">
                {viewingEvent.status}
              </span>
              <span className="font-body text-sm text-ink-light">
                {formatDateTime(viewingEvent.starts_at)}
                {viewingEvent.ends_at ? ` – ${formatDateTime(viewingEvent.ends_at)}` : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-body text-sm text-ink">
              <div><span className="text-ink-light">Lugar:</span> {viewingEvent.venue?.name ?? "—"}</div>
              <div><span className="text-ink-light">Cupo:</span> {viewingEvent.capacity}</div>
              <div><span className="text-ink-light">Precio:</span> {formatARS(viewingEvent.price_per_person)}/persona</div>
              {viewingEvent.event_type && (
                <div><span className="text-ink-light">Tipo:</span> {EVENT_TYPE_LABELS[viewingEvent.event_type]}</div>
              )}
              {viewingEvent.reward_rp > 0 && (
                <div><span className="text-ink-light">Recompensa:</span> +{viewingEvent.reward_rp} RP por asistir</div>
              )}
            </div>

            {viewingEvent.description && (
              <p className="font-body text-sm text-ink-light leading-relaxed">{viewingEvent.description}</p>
            )}

            {viewingEvent.game_ids.length > 0 && (
              <div>
                <h3 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-2">Juegos destacados</h3>
                <div className="flex flex-wrap gap-1.5">
                  {viewingEvent.game_ids.map((gid) => {
                    const g = games.find((game) => game.id === gid);
                    return g ? (
                      <span key={gid} className="font-label text-xs px-2.5 py-1 rounded-sm bg-leather/10 text-leather">{g.name}</span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {viewingEvent.quest_ids.length > 0 && (
              <div>
                <h3 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-2">Misiones disponibles</h3>
                <div className="flex flex-wrap gap-1.5">
                  {viewingEvent.quest_ids.map((qid) => {
                    const q = quests.find((quest) => quest.id === qid);
                    return q ? (
                      <span key={qid} className="font-label text-xs px-2.5 py-1 rounded-sm bg-brass/10 text-brass">{q.title}</span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-2">
                Registros ({eventBookings.length})
              </h3>
              {eventBookings.length === 0 ? (
                <p className="font-body italic text-sm text-ink-light">Todavía no hay reservas.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {eventBookings.map((b) => (
                    <div key={b.id} className="border border-border p-3 bg-parchment/40 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-label text-sm font-bold text-ink">{b.name}</p>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="font-body text-xs text-ink-light">
                          {b.email}{b.phone ? ` · ${b.phone}` : ""} · {b.guest_count} persona{b.guest_count !== 1 ? "s" : ""} · {formatARS(b.cost)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {b.receipt_path && (
                          <button onClick={() => viewReceipt(b.id)} className="p-1.5 text-leather-light hover:text-brass transition-colors" title="Ver comprobante">
                            <Receipt size={16} />
                          </button>
                        )}
                        {b.status === "approved" && (
                          <label className="flex items-center gap-1.5 font-label text-2xs uppercase tracking-wide text-ink cursor-pointer">
                            <input
                              type="checkbox"
                              className="accent-moss size-4"
                              checked={b.attended}
                              disabled={attendanceBusyId === b.id}
                              onChange={(e) => toggleAttendance(b.id, e.target.checked)}
                            />
                            Asistió
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
