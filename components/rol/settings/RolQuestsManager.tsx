"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Swords } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RolQuestStatus, ShgRolLocation, ShgRolQuestNote } from "@/types/database";

interface QuestRow {
  id: string;
  title: string;
  description: string;
  status: RolQuestStatus;
  reward_coin: number;
  reward_standing: number;
  reward_supplies: number;
  completed_at: string | null;
  location: { id: string; name: string } | { id: string; name: string }[] | null;
  participants: { character: { id: string; name: string } | { id: string; name: string }[] | null }[];
}
interface CharacterOption { id: string; name: string; ownerName: string }

const STATUS_LABELS: Record<RolQuestStatus, string> = { available: "Disponible", active: "Activa", completed: "Completada" };
const STATUS_STYLES: Record<RolQuestStatus, string> = {
  available: "bg-brass/15 text-brass",
  active: "bg-moss/15 text-moss-dark",
  completed: "bg-leather/10 text-leather",
};

const EMPTY = { title: "", description: "", location_id: "", reward_coin: "0", reward_standing: "0", reward_supplies: "0" };

function oneOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function QuestDetail({ quest, characters, onChanged }: { quest: QuestRow; characters: CharacterOption[]; onChanged: () => void }) {
  const [notes, setNotes] = React.useState<ShgRolQuestNote[] | null>(null);
  const [selectedCharacterIds, setSelectedCharacterIds] = React.useState<string[]>([]);
  const [publicNote, setPublicNote] = React.useState("");
  const [dmNote, setDmNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const loadNotes = React.useCallback(async () => {
    const res = await fetch(`/api/admin/rol/quests/${quest.id}/notes`);
    const json = await res.json();
    setNotes(json.data ?? []);
  }, [quest.id]);

  React.useEffect(() => { loadNotes(); }, [loadNotes]);

  async function handleInitiate() {
    if (selectedCharacterIds.length === 0) { toast.error("Elegí al menos un personaje."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/rol/quests/${quest.id}/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character_ids: selectedCharacterIds }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error."); return; }
      toast.success("Misión iniciada.");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!confirm("¿Completar esta misión y otorgar las recompensas?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/rol/quests/${quest.id}/complete`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error."); return; }
      toast.success("Misión completada y recompensas otorgadas.");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function addNote(visibility: "public" | "dm_private", content: string, clear: () => void) {
    if (!content.trim()) return;
    const res = await fetch(`/api/admin/rol/quests/${quest.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility, content }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Error al guardar la nota."); return; }
    clear();
    loadNotes();
  }

  if (!notes) return <p className="font-body text-xs italic text-ink-light pt-3 border-t border-border">Cargando…</p>;

  const publicNotes = notes.filter((n) => n.visibility === "public");
  const dmNotes = notes.filter((n) => n.visibility === "dm_private");
  const playerThreads = new Map<string, ShgRolQuestNote[]>();
  for (const n of notes.filter((n) => n.visibility === "player_private" && n.character_id)) {
    const list = playerThreads.get(n.character_id!) ?? [];
    list.push(n);
    playerThreads.set(n.character_id!, list);
  }

  return (
    <div className="flex flex-col gap-4 pt-3 border-t border-border">
      {quest.status === "available" && (
        <div>
          <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">Iniciar misión — elegí personajes</p>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto border border-border p-2 mb-2">
            {characters.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs font-body text-ink-light cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-brass"
                  checked={selectedCharacterIds.includes(c.id)}
                  onChange={(e) => setSelectedCharacterIds((ids) =>
                    e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id)
                  )}
                />
                {c.name} <span className="text-leather-light">({c.ownerName})</span>
              </label>
            ))}
          </div>
          <Button size="sm" onClick={handleInitiate} loading={busy}>Iniciar misión</Button>
        </div>
      )}

      {quest.status === "active" && (
        <Button size="sm" variant="secondary" onClick={handleComplete} loading={busy}>Completar y otorgar recompensas</Button>
      )}

      {quest.status !== "available" && (
        <div>
          <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">Participantes</p>
          <p className="font-body text-xs text-ink-light">
            {quest.participants.map((p) => oneOf(p.character)?.name).filter(Boolean).join(", ") || "—"}
          </p>
        </div>
      )}

      {quest.status !== "available" && (
        <>
          <div>
            <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">Notas públicas (todos los que tienen acceso)</p>
            <div className="flex flex-col gap-1 mb-2 max-h-32 overflow-y-auto">
              {publicNotes.map((n) => <p key={n.id} className="font-body text-xs text-ink-light border-l-2 border-brass/40 pl-2">{n.content}</p>)}
            </div>
            <div className="flex gap-2">
              <Input wrapperClassName="flex-1" value={publicNote} onChange={(e) => setPublicNote(e.target.value)} placeholder="Agregar nota pública…" />
              <Button size="sm" onClick={() => addNote("public", publicNote, () => setPublicNote(""))}>Agregar</Button>
            </div>
          </div>

          <div>
            <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">Notas privadas del DM</p>
            <div className="flex flex-col gap-1 mb-2 max-h-32 overflow-y-auto">
              {dmNotes.map((n) => <p key={n.id} className="font-body text-xs text-ink-light border-l-2 border-crimson/40 pl-2">{n.content}</p>)}
            </div>
            <div className="flex gap-2">
              <Input wrapperClassName="flex-1" value={dmNote} onChange={(e) => setDmNote(e.target.value)} placeholder="Agregar nota privada…" />
              <Button size="sm" onClick={() => addNote("dm_private", dmNote, () => setDmNote(""))}>Agregar</Button>
            </div>
          </div>

          {quest.participants.map((p) => {
            const character = oneOf(p.character);
            if (!character) return null;
            const thread = playerThreads.get(character.id) ?? [];
            return (
              <div key={character.id}>
                <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">Notas privadas — {character.name}</p>
                <div className="flex flex-col gap-1">
                  {thread.length === 0
                    ? <p className="font-body text-xs italic text-ink-light">Sin notas todavía.</p>
                    : thread.map((n) => (
                      <p key={n.id} className="font-body text-xs text-ink-light border-l-2 border-moss/40 pl-2">
                        {n.author_kind === "admin" ? "DM: " : ""}{n.content}
                      </p>
                    ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export function RolQuestsManager() {
  const [quests, setQuests] = React.useState<QuestRow[]>([]);
  const [locations, setLocations] = React.useState<ShgRolLocation[]>([]);
  const [characters, setCharacters] = React.useState<CharacterOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<QuestRow | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [questsRes, locRes, charRes] = await Promise.all([
      fetch("/api/admin/rol/quests"), fetch("/api/admin/rol/locations"), fetch("/api/admin/rol/characters"),
    ]);
    setQuests((await questsRes.json()).data ?? []);
    setLocations((await locRes.json()).data ?? []);
    setCharacters((await charRes.json()).data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(q: QuestRow) {
    setEditing(q);
    setForm({
      title: q.title, description: q.description,
      location_id: oneOf(q.location)?.id ?? "",
      reward_coin: String(q.reward_coin), reward_standing: String(q.reward_standing), reward_supplies: String(q.reward_supplies),
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        location_id: form.location_id || null,
        reward_coin: Number(form.reward_coin) || 0,
        reward_standing: Number(form.reward_standing) || 0,
        reward_supplies: Number(form.reward_supplies) || 0,
      };
      const res = await fetch(editing ? `/api/admin/rol/quests/${editing.id}` : "/api/admin/rol/quests", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Misión guardada.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(q: QuestRow) {
    if (!confirm(`¿Eliminar la misión "${q.title}"?`)) return;
    const res = await fetch(`/api/admin/rol/quests/${q.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Misión eliminada."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Misiones del Gremio</h1>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nueva misión</Button>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : quests.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay misiones cargadas.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {quests.map((q) => (
            <div key={q.id} className="surface-parchment p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="relative size-9 shrink-0 rounded-full bg-brass/15 flex items-center justify-center overflow-hidden">
                    <Swords size={16} className="text-brass" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <p className="font-label text-sm font-bold text-ink">{q.title}</p>
                      <span className={cn("font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm", STATUS_STYLES[q.status])}>
                        {STATUS_LABELS[q.status]}
                      </span>
                      {oneOf(q.location) && (
                        <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                          {oneOf(q.location)?.name}
                        </span>
                      )}
                    </div>
                    <p className="font-body text-xs text-ink-light line-clamp-2">{q.description}</p>
                    <p className="font-body text-2xs text-ink-light mt-0.5">
                      {q.reward_coin} monedas · {q.reward_standing} pts. de gremio · {q.reward_supplies} suministros
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} className="p-1.5 text-leather-light hover:text-brass transition-colors">
                    {expandedId === q.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  {q.status === "available" && (
                    <button onClick={() => openEdit(q)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                  )}
                  <button onClick={() => handleDelete(q)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>
              {expandedId === q.id && <QuestDetail quest={q} characters={characters} onChanged={load} />}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar misión" : "Nueva misión"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Título" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Descripción" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select label="Ubicación (opcional)" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
            <option value="">Ninguna</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Monedas" type="number" min={0} value={form.reward_coin} onChange={(e) => setForm({ ...form, reward_coin: e.target.value })} />
            <Input label="Pts. de gremio" type="number" min={0} value={form.reward_standing} onChange={(e) => setForm({ ...form, reward_standing: e.target.value })} />
            <Input label="Suministros" type="number" min={0} value={form.reward_supplies} onChange={(e) => setForm({ ...form, reward_supplies: e.target.value })} />
          </div>
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
