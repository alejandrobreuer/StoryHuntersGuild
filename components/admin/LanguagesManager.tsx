"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Languages } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { ShgLanguage } from "@/types/database";

export function LanguagesManager() {
  const [languages, setLanguages] = React.useState<ShgLanguage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgLanguage | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/languages");
    const json = await res.json();
    setLanguages(json.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setCode("");
    setName("");
    setModalOpen(true);
  }

  function openEdit(l: ShgLanguage) {
    setEditing(l);
    setCode(l.code);
    setName(l.name);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/languages/${editing.id}` : "/api/admin/languages", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success(editing ? "Idioma actualizado." : "Idioma creado.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(l: ShgLanguage) {
    if (!confirm(`¿Eliminar el idioma "${l.name}"? Se quitará de todos los juegos que lo tengan.`)) return;
    const res = await fetch(`/api/admin/languages/${l.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Idioma eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo idioma</Button>
      </div>

      <p className="font-body text-sm text-parchment-dark mb-4">
        Idiomas que se pueden asignar a los juegos. El código corto (por ejemplo EN o ES) es lo que se
        muestra en la Ludoteca. Editar o eliminar un idioma acá lo actualiza en todos sus juegos.
      </p>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : languages.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay idiomas cargados.</p>
      ) : (
        // Same light surface as TagsManager / OwnersManager.
        <div className="surface-parchment p-4 rounded-sm flex flex-wrap gap-2">
          {languages.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-1.5 font-label text-2xs uppercase tracking-wide px-2.5 py-1.5 rounded-sm bg-brass/15 text-brass border border-brass/20"
            >
              <Languages size={11} />
              <span className="font-bold">{l.code}</span>
              <span className="normal-case">{l.name}</span>
              <button onClick={() => openEdit(l)} className="ml-1 text-leather-light hover:text-brass transition-colors" aria-label={`Editar ${l.name}`}>
                <Edit2 size={12} />
              </button>
              <button onClick={() => handleDelete(l)} className="text-leather-light hover:text-crimson transition-colors" aria-label={`Eliminar ${l.name}`}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar idioma" : "Nuevo idioma"} footer={<Button type="submit" form="languages-manager-form" loading={saving} className="w-full">Guardar</Button>}>
        <form id="languages-manager-form" onSubmit={handleSave} className="flex flex-col gap-3">
          <Input
            label="Código corto" required maxLength={5} placeholder="EN"
            value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoFocus
          />
          <Input label="Nombre" required maxLength={50} placeholder="Inglés" value={name} onChange={(e) => setName(e.target.value)} />
        </form>
      </Modal>
    </div>
  );
}
