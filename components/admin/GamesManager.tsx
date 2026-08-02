"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { ShgGame, GameComplexity } from "@/types/database";

const EMPTY = {
  name: "", min_players: 2, max_players: 4, playtime_minutes: 60,
  complexity: "light" as GameComplexity, beginner_friendly: false,
  tags: "", image_url: "", description: "",
};

export function GamesManager() {
  const [games, setGames] = React.useState<ShgGame[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgGame | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/games");
    const json = await res.json();
    setGames(json.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(g: ShgGame) {
    setEditing(g);
    setForm({
      name: g.name, min_players: g.min_players, max_players: g.max_players,
      playtime_minutes: g.playtime_minutes, complexity: g.complexity,
      beginner_friendly: g.beginner_friendly, tags: g.tags.join(", "),
      image_url: g.image_url ?? "", description: g.description ?? "",
    });
    setModalOpen(true);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al subir imagen."); return; }
      setForm((f) => ({ ...f, image_url: json.data.url }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const res = await fetch(editing ? `/api/admin/games/${editing.id}` : "/api/admin/games", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Juego guardado.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este juego?")) return;
    const res = await fetch(`/api/admin/games/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Juego eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Juegos</h1>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo juego</Button>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {games.map((g) => (
            <div key={g.id} className="surface-parchment p-4 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-label text-sm font-bold text-ink">{g.name}</p>
                <p className="font-body text-xs text-ink-light">{g.min_players}–{g.max_players} jugadores · {g.playtime_minutes} min</p>
                {g.beginner_friendly && <span className="text-2xs text-moss-dark font-label uppercase">Para empezar</span>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(g)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(g.id)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar juego" : "Nuevo juego"} className="max-w-lg">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Min. jugadores" type="number" min={1} required value={form.min_players} onChange={(e) => setForm({ ...form, min_players: Number(e.target.value) })} />
            <Input label="Máx. jugadores" type="number" min={1} required value={form.max_players} onChange={(e) => setForm({ ...form, max_players: Number(e.target.value) })} />
            <Input label="Minutos" type="number" min={1} required value={form.playtime_minutes} onChange={(e) => setForm({ ...form, playtime_minutes: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <Select label="Complejidad" value={form.complexity} onChange={(e) => setForm({ ...form, complexity: e.target.value as GameComplexity })}>
              <option value="light">Fácil</option>
              <option value="medium">Intermedio</option>
              <option value="heavy">Avanzado</option>
            </Select>
            <label className="flex items-center gap-2 font-body text-sm text-ink pb-2.5">
              <input type="checkbox" className="accent-moss size-4" checked={form.beginner_friendly} onChange={(e) => setForm({ ...form, beginner_friendly: e.target.checked })} />
              Ideal para empezar
            </label>
          </div>
          <Input label="Tags (separados por coma)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Imagen</label>
            <label className="flex items-center gap-2 border border-dashed border-border px-3 py-2.5 cursor-pointer hover:border-brass transition-colors text-sm font-body text-ink-light">
              <Upload size={15} />
              {uploading ? "Subiendo…" : form.image_url ? "Cambiar imagen" : "Subir imagen"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
            </label>
          </div>
          <Textarea label="Descripción" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
