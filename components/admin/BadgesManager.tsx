"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, Award, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { ShgBadge } from "@/types/database";

const EMPTY = { name: "", description: "", icon: "", icon_url: "" };

export function BadgesManager() {
  const [badges, setBadges] = React.useState<ShgBadge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgBadge | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/badges");
    const json = await res.json();
    setBadges(json.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(b: ShgBadge) {
    setEditing(b);
    setForm({ name: b.name, description: b.description ?? "", icon: b.icon ?? "", icon_url: b.icon_url ?? "" });
    setModalOpen(true);
  }

  async function handleIconUpload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al subir imagen."); return; }
      setForm((f) => ({ ...f, icon_url: json.data.url }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/badges/${editing.id}` : "/api/admin/badges", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Insignia guardada.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b: ShgBadge) {
    if (!confirm(`¿Eliminar la insignia "${b.name}"?`)) return;
    const res = await fetch(`/api/admin/badges/${b.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Insignia eliminada."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nueva insignia</Button>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : badges.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay insignias cargadas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map((b) => (
            <div key={b.id} className="surface-parchment p-4 flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 min-w-0">
                <div className="relative size-9 shrink-0 rounded-full bg-brass/15 flex items-center justify-center text-lg overflow-hidden">
                  {b.icon_url ? (
                    <Image src={b.icon_url} alt="" fill className="object-cover" sizes="36px" />
                  ) : (
                    b.icon || <Award size={16} className="text-brass" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-label text-sm font-bold text-ink">{b.name}</p>
                  {b.description && <p className="font-body text-xs text-ink-light">{b.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(b)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(b)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar insignia" : "Nueva insignia"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="Ícono (un emoji corto)"
            placeholder="🏆"
            maxLength={10}
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
          />
          <Textarea label="Descripción" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Imagen de la insignia (opcional)</label>
            <p className="font-body text-2xs text-ink-light -mt-1">Si subís una imagen, reemplaza al emoji en el perfil de los usuarios.</p>
            <div className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 rounded-full bg-parchment-dark/40 border border-brass/30 flex items-center justify-center overflow-hidden text-xl">
                {form.icon_url ? (
                  <Image src={form.icon_url} alt="" fill className="object-cover" sizes="56px" />
                ) : (
                  form.icon || <Award size={18} className="text-leather-light" />
                )}
              </div>
              <label className="flex items-center gap-2 border border-dashed border-border px-3 py-2.5 cursor-pointer hover:border-brass transition-colors text-sm font-body text-ink-light flex-1">
                <Upload size={15} />
                {uploading ? "Subiendo…" : form.icon_url ? "Cambiar imagen" : "Subir imagen"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleIconUpload(e.target.files[0])}
                />
              </label>
            </div>
          </div>
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
