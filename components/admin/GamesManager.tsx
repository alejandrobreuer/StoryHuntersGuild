"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, Upload, Dice5 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { RulesContent } from "@/components/games/RulesContent";
import { parseRulesMarkup } from "@/lib/rules-markup";
import { toast } from "sonner";
import type { ShgGame, GameComplexity } from "@/types/database";

const EMPTY = {
  name: "", min_players: 2, max_players: 4, playtime_minutes: 60,
  complexity: "light" as GameComplexity, beginner_friendly: false,
  tags: "", image_url: "", description: "", bgg_link: "", available: true, rules: "",
};

const RULES_TOOLBAR: { label: string; kind: "line" | "wrap"; value: string; after?: string; placeholder: string }[] = [
  { label: "Título",     kind: "line", value: "# ",       placeholder: "Título de sección" },
  { label: "Subtítulo",  kind: "line", value: "## ",      placeholder: "Subtítulo" },
  { label: "Viñeta",     kind: "line", value: "- ",       placeholder: "Punto de la lista" },
  { label: "Negrita",    kind: "wrap", value: "**", after: "**", placeholder: "texto en negrita" },
  { label: "Consejo",    kind: "line", value: "!tip ",     placeholder: "Consejo útil" },
  { label: "Atención",   kind: "line", value: "!warning ", placeholder: "Punto importante" },
  { label: "Nota",       kind: "line", value: "!note ",    placeholder: "Nota adicional" },
];

export function GamesManager() {
  const [games, setGames] = React.useState<ShgGame[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgGame | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const rulesRef = React.useRef<HTMLTextAreaElement>(null);

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
      bgg_link: g.bgg_link ?? "", available: g.available, rules: g.rules ?? "",
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

  function applyRulesTool(tool: (typeof RULES_TOOLBAR)[number]) {
    const el = rulesRef.current;
    const current = form.rules;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;

    if (tool.kind === "wrap") {
      const selectedText = current.slice(start, end) || tool.placeholder;
      const newValue = current.slice(0, start) + tool.value + selectedText + (tool.after ?? "") + current.slice(end);
      setForm((f) => ({ ...f, rules: newValue }));
      const cursor = start + tool.value.length + selectedText.length + (tool.after?.length ?? 0);
      requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(cursor, cursor); });
    } else {
      const needsLeadingNewline = start > 0 && current[start - 1] !== "\n";
      const line = (needsLeadingNewline ? "\n" : "") + tool.value + tool.placeholder + "\n";
      const newValue = current.slice(0, start) + line + current.slice(start);
      setForm((f) => ({ ...f, rules: newValue }));
      const cursor = start + line.length;
      requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(cursor, cursor); });
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
              <div className="flex items-start gap-3 min-w-0">
                <div className="relative size-11 shrink-0 bg-parchment-dark/40 border border-border flex items-center justify-center overflow-hidden">
                  {g.image_url ? (
                    <Image src={g.image_url} alt="" fill className="object-cover" sizes="44px" />
                  ) : (
                    <Dice5 size={18} className="text-leather-light" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-label text-sm font-bold text-ink">{g.name}</p>
                  <p className="font-body text-xs text-ink-light">{g.min_players}–{g.max_players} jugadores · {g.playtime_minutes} min</p>
                  <div className="flex flex-wrap gap-x-2">
                    {g.beginner_friendly && <span className="text-2xs text-moss-dark font-label uppercase">Para empezar</span>}
                    {!g.available && <span className="text-2xs text-crimson font-label uppercase">No disponible</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(g)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(g.id)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar juego" : "Nuevo juego"}
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
      >
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
          <label className="flex items-center gap-2 font-body text-sm text-ink">
            <input type="checkbox" className="accent-moss size-4" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
            Disponible (si está destildado, sigue apareciendo en la Ludoteca marcado como no disponible)
          </label>
          <Input label="Tags (separados por coma)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <Input label="Link de BoardGameGeek (opcional)" type="url" placeholder="https://boardgamegeek.com/boardgame/…" value={form.bgg_link} onChange={(e) => setForm({ ...form, bgg_link: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Imagen</label>
            <div className="flex items-center gap-3">
              <div className="relative size-20 shrink-0 bg-parchment-dark/40 border border-brass/30 flex items-center justify-center overflow-hidden">
                {form.image_url ? (
                  <Image src={form.image_url} alt="" fill className="object-contain" sizes="80px" />
                ) : (
                  <Dice5 size={24} className="text-leather-light" />
                )}
              </div>
              <label className="flex items-center gap-2 border border-dashed border-border px-3 py-2.5 cursor-pointer hover:border-brass transition-colors text-sm font-body text-ink-light flex-1">
                <Upload size={15} />
                {uploading ? "Subiendo…" : form.image_url ? "Cambiar imagen" : "Subir imagen"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                />
              </label>
            </div>
            <p className="font-body text-2xs text-ink-light/70">JPG, PNG, WebP o GIF — hasta 5MB. Se recorta automáticamente a cuadrado al mostrarse.</p>
          </div>
          <Textarea label="Descripción" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="flex flex-col gap-1.5">
            <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Reglas (opcional)</label>
            <div className="flex flex-wrap gap-1.5">
              {RULES_TOOLBAR.map((tool) => (
                <button
                  key={tool.label}
                  type="button"
                  onClick={() => applyRulesTool(tool)}
                  className="font-label text-2xs px-2.5 py-1 border border-border rounded-sm text-ink-light hover:border-brass hover:text-ink transition-colors"
                >
                  {tool.label}
                </button>
              ))}
            </div>
            <Textarea
              ref={rulesRef}
              rows={8}
              value={form.rules}
              onChange={(e) => setForm({ ...form, rules: e.target.value })}
              placeholder={"# Título\n- Punto de la lista\n!tip Un consejo útil"}
            />
            <p className="font-body text-2xs text-ink-light/70">
              Usá los botones de arriba o escribí directo: <code>#</code> título, <code>##</code> subtítulo, <code>-</code> viñeta, <code>**texto**</code> negrita, <code>!tip</code>/<code>!warning</code>/<code>!note</code> para recuadros de color.
            </p>
            {form.rules.trim() && (
              <div className="border border-border bg-parchment/40 p-3 mt-1">
                <p className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light mb-2">Vista previa</p>
                <RulesContent blocks={parseRulesMarkup(form.rules)} />
              </div>
            )}
          </div>

          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
