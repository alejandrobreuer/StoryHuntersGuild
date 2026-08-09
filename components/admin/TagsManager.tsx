"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { ShgTag } from "@/types/database";

export function TagsManager() {
  const [tags, setTags] = React.useState<ShgTag[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgTag | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/tags");
    const json = await res.json();
    setTags(json.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setName("");
    setModalOpen(true);
  }

  function openEdit(t: ShgTag) {
    setEditing(t);
    setName(t.name);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/tags/${editing.id}` : "/api/admin/tags", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success(editing ? "Tag renombrado." : "Tag creado.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: ShgTag) {
    if (!confirm(`¿Eliminar el tag "${t.name}"? Se quitará de todos los juegos que lo tengan.`)) return;
    const res = await fetch(`/api/admin/tags/${t.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Tag eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Tags</h1>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo tag</Button>
      </div>

      <p className="font-body text-sm text-parchment-dark mb-4">
        Lista predefinida de tags que se pueden asignar a los juegos. Renombrar o eliminar un tag
        acá lo actualiza automáticamente en todos los juegos que lo tengan.
      </p>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : tags.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay tags cargados.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-1.5 font-label text-2xs uppercase tracking-wide px-2.5 py-1.5 rounded-sm bg-leather/10 text-leather"
            >
              <TagIcon size={11} />
              {t.name}
              <button onClick={() => openEdit(t)} className="ml-1 text-leather-light hover:text-brass transition-colors" aria-label={`Renombrar ${t.name}`}>
                <Edit2 size={12} />
              </button>
              <button onClick={() => handleDelete(t)} className="text-leather-light hover:text-crimson transition-colors" aria-label={`Eliminar ${t.name}`}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Renombrar tag" : "Nuevo tag"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
