"use client";

import * as React from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { ShgVenue } from "@/types/database";

const EMPTY = { name: "", address: "", city: "", map_url: "", notes: "" };

export function VenuesManager() {
  const [venues, setVenues] = React.useState<ShgVenue[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgVenue | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);

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
    setForm({ name: v.name, address: v.address, city: v.city ?? "", map_url: v.map_url ?? "", notes: v.notes ?? "" });
    setModalOpen(true);
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
              <div className="min-w-0">
                <p className="font-label text-sm font-bold text-ink">{v.name}</p>
                <p className="font-body text-xs text-ink-light truncate">{v.address}{v.city ? `, ${v.city}` : ""}</p>
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
          <Textarea label="Notas internas (no públicas)" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
