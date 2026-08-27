"use client";

import * as React from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { ShgRolGuildStatus } from "@/types/database";

const EMPTY = { name: "", sort_order: "0" };

// Guild Status is GM-advanced by hand (see GuildIdentityForm's status
// selector) — not computed from any number, unlike character ranks. This
// panel only manages the catalog of tiers; promoting the guild through them
// happens in the guild identity form.
export function GuildStatusManager({ onChanged }: { onChanged?: () => void }) {
  const [statuses, setStatuses] = React.useState<ShgRolGuildStatus[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgRolGuildStatus | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/rol/guild-statuses");
    const json = await res.json();
    setStatuses(json.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(s: ShgRolGuildStatus) {
    setEditing(s);
    setForm({ name: s.name, sort_order: String(s.sort_order) });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/rol/guild-statuses/${editing.id}` : "/api/admin/rol/guild-statuses", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, sort_order: Number(form.sort_order) || 0 }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Estado guardado.");
      setModalOpen(false);
      load();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este estado del gremio? Las funciones que lo requieran quedarán sin requisito de estado.")) return;
    const res = await fetch(`/api/admin/rol/guild-statuses/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Estado eliminado."); load(); onChanged?.(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div className="surface-parchment p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink">Estados del gremio</h2>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo estado</Button>
      </div>

      {loading ? (
        <p className="font-body italic text-ink-light text-sm">Cargando…</p>
      ) : statuses.length === 0 ? (
        <p className="font-body italic text-ink-light text-sm">Todavía no hay estados cargados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {statuses.map((s) => (
            <div key={s.id} className="border border-border bg-parchment/40 p-3 flex items-center justify-between gap-3">
              <p className="font-label text-sm font-bold text-ink">#{s.sort_order} — {s.name}</p>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(s)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar estado" : "Nuevo estado"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Orden (menor = primero)" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
