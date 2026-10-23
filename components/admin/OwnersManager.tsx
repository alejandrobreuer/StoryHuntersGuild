"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { ShgGameOwner } from "@/types/database";

export function OwnersManager() {
  const [owners, setOwners] = React.useState<ShgGameOwner[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgGameOwner | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/owners");
    const json = await res.json();
    setOwners(json.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setName("");
    setModalOpen(true);
  }

  function openEdit(o: ShgGameOwner) {
    setEditing(o);
    setName(o.name);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/owners/${editing.id}` : "/api/admin/owners", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success(editing ? "Dueño renombrado." : "Dueño creado.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(o: ShgGameOwner) {
    if (!confirm(`¿Eliminar el dueño "${o.name}"? Se quitará de todos los juegos donde esté asignado.`)) return;
    const res = await fetch(`/api/admin/owners/${o.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Dueño eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo dueño</Button>
      </div>

      <p className="font-body text-sm text-parchment-dark mb-4">
        Lista de dueños que se pueden asignar a los juegos (uso interno, no se muestra a los jugadores).
        Renombrar o eliminar un dueño acá lo actualiza automáticamente en todos sus juegos.
      </p>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : owners.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay dueños cargados.</p>
      ) : (
        // Same light surface as TagsManager — see the note there.
        <div className="surface-parchment p-4 rounded-sm flex flex-wrap gap-2">
          {owners.map((o) => (
            <div
              key={o.id}
              className="flex items-center gap-1.5 font-label text-2xs uppercase tracking-wide px-2.5 py-1.5 rounded-sm bg-brass/15 text-brass border border-brass/20"
            >
              <User size={11} />
              {o.name}
              <button onClick={() => openEdit(o)} className="ml-1 text-leather-light hover:text-brass transition-colors" aria-label={`Renombrar ${o.name}`}>
                <Edit2 size={12} />
              </button>
              <button onClick={() => handleDelete(o)} className="text-leather-light hover:text-crimson transition-colors" aria-label={`Eliminar ${o.name}`}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Renombrar dueño" : "Nuevo dueño"} footer={<Button type="submit" form="owners-manager-form" loading={saving} className="w-full">Guardar</Button>}>
        <form id="owners-manager-form" onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </form>
      </Modal>
    </div>
  );
}
