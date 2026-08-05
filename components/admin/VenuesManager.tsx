"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, Upload, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { ShgVenue } from "@/types/database";

const EMPTY = { name: "", address: "", city: "", map_url: "", instagram_url: "", logo_url: "", notes: "" };

export function VenuesManager() {
  const [venues, setVenues] = React.useState<ShgVenue[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgVenue | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/venues");
    const json = await res.json();
    setVenues(json.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(v: ShgVenue) {
    setEditing(v);
    setForm({
      name: v.name, address: v.address, city: v.city ?? "", map_url: v.map_url ?? "",
      instagram_url: v.instagram_url ?? "", logo_url: v.logo_url ?? "", notes: v.notes ?? "",
    });
    setModalOpen(true);
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al subir imagen."); return; }
      setForm((f) => ({ ...f, logo_url: json.data.url }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/venues/${editing.id}` : "/api/admin/venues", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Lugar guardado.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este lugar?")) return;
    const res = await fetch(`/api/admin/venues/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Lugar eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Lugares</h1>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo lugar</Button>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : venues.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay lugares cargados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {venues.map((v) => (
            <div key={v.id} className="surface-parchment p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative size-11 shrink-0 bg-parchment-dark/40 border border-border flex items-center justify-center overflow-hidden">
                  {v.logo_url ? (
                    <Image src={v.logo_url} alt="" fill className="object-contain" sizes="44px" />
                  ) : (
                    <MapPin size={18} className="text-leather-light" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-label text-sm font-bold text-ink">{v.name}</p>
                  <p className="font-body text-xs text-ink-light truncate">{v.address}{v.city ? `, ${v.city}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(v)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(v.id)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar lugar" : "Nuevo lugar"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Dirección" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="Enlace al mapa" value={form.map_url} onChange={(e) => setForm({ ...form, map_url: e.target.value })} />
          <Input
            label="Instagram (opcional)"
            type="url"
            placeholder="https://instagram.com/…"
            value={form.instagram_url}
            onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Logo (opcional)</label>
            <div className="flex items-center gap-3">
              <div className="relative size-16 shrink-0 bg-parchment-dark/40 border border-brass/30 flex items-center justify-center overflow-hidden">
                {form.logo_url ? (
                  <Image src={form.logo_url} alt="" fill className="object-contain" sizes="64px" />
                ) : (
                  <MapPin size={20} className="text-leather-light" />
                )}
              </div>
              <label className="flex items-center gap-2 border border-dashed border-border px-3 py-2.5 cursor-pointer hover:border-brass transition-colors text-sm font-body text-ink-light flex-1">
                <Upload size={15} />
                {uploading ? "Subiendo…" : form.logo_url ? "Cambiar logo" : "Subir logo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />
              </label>
            </div>
          </div>
          <Textarea label="Notas internas (no públicas)" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
