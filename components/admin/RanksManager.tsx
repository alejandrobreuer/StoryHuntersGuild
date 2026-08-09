"use client";

import * as React from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { ShgRank } from "@/types/database";

const EMPTY = { name: "", rp_required: 0, benefit: "" };

export function RanksManager() {
  const [ranks, setRanks] = React.useState<ShgRank[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgRank | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/ranks");
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

  function openEdit(r: ShgRank) {
    setEditing(r);
    setForm({ name: r.name, rp_required: r.rp_required, benefit: r.benefit ?? "" });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/ranks/${editing.id}` : "/api/admin/ranks", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  async function handleDelete(r: ShgRank) {
    if (!confirm(`¿Eliminar el rango "${r.name}"?`)) return;
    const res = await fetch(`/api/admin/ranks/${r.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Rango eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Rangos</h1>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo rango</Button>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : ranks.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay rangos cargados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {[...ranks].sort((a, b) => a.rp_required - b.rp_required).map((r) => (
            <div key={r.id} className="surface-parchment p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-label text-sm font-bold text-ink">{r.name}</p>
                  <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/15 text-brass">
                    {r.rp_required} RP
                  </span>
                </div>
                {r.benefit && <p className="font-body text-xs text-ink-light">{r.benefit}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(r)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(r)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar rango" : "Nuevo rango"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="RP necesarios"
            type="number"
            min={0}
            required
            value={form.rp_required}
            onChange={(e) => setForm({ ...form, rp_required: Number(e.target.value) })}
          />
          <Textarea label="Beneficio" rows={3} value={form.benefit} onChange={(e) => setForm({ ...form, benefit: e.target.value })} />
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
