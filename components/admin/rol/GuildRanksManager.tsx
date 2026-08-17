"use client";

import * as React from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { ShgRolGuildRank } from "@/types/database";

const EMPTY = { name: "", points_threshold: "0", sort_order: "0" };

export function GuildRanksManager() {
  const [ranks, setRanks] = React.useState<ShgRolGuildRank[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgRolGuildRank | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/rol/guild-ranks");
    const json = await res.json();
    setRanks(json.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(r: ShgRolGuildRank) {
    setEditing(r);
    setForm({ name: r.name, points_threshold: String(r.points_threshold), sort_order: String(r.sort_order) });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/rol/guild-ranks/${editing.id}` : "/api/admin/rol/guild-ranks", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          points_threshold: Number(form.points_threshold) || 0,
          sort_order: Number(form.sort_order) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Rango guardado.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este rango?")) return;
    const res = await fetch(`/api/admin/rol/guild-ranks/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Rango eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div className="surface-parchment p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink">Rangos del gremio</h2>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo rango</Button>
      </div>

      {loading ? (
        <p className="font-body italic text-ink-light text-sm">Cargando…</p>
      ) : ranks.length === 0 ? (
        <p className="font-body italic text-ink-light text-sm">Todavía no hay rangos cargados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ranks.map((r) => (
            <div key={r.id} className="border border-border bg-parchment/40 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-label text-sm font-bold text-ink">{r.name}</p>
                <p className="font-body text-xs text-ink-light">{r.points_threshold} puntos de gremio</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(r)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(r.id)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar rango" : "Nuevo rango"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Puntos necesarios" type="number" min={0} required value={form.points_threshold} onChange={(e) => setForm({ ...form, points_threshold: e.target.value })} />
          <Input label="Orden" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
