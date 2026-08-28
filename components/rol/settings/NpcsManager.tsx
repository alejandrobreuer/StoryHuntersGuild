"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Flag, Tag, Contact, Upload, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NPC_STANDINGS, labelForStanding, badgeClassForStanding } from "@/lib/rol/npcStandings";
import type { ShgRolFaction, ShgRolNpcTag, ShgRolLocation, RolNpcStanding } from "@/types/database";

interface NpcFactionLink {
  is_former: boolean;
  faction:   { id: string; name: string } | { id: string; name: string }[] | null;
}

interface NpcRow {
  id:             string;
  name:           string;
  description:    string;
  standing:       RolNpcStanding;
  portrait_url:   string | null;
  full_body_url:  string | null;
  residence:      { id: string; name: string } | { id: string; name: string }[] | null;
  origin:         { id: string; name: string } | { id: string; name: string }[] | null;
  factions:       NpcFactionLink[];
  tags:           string[];
  hidden:         boolean;
}

interface FactionLinkForm {
  faction_id: string;
  is_former:  boolean;
}

function oneOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const EMPTY_NPC = {
  name: "", description: "", residence_location_id: "", origin_location_id: "",
  standing: "neutral" as RolNpcStanding, portrait_url: "", full_body_url: "",
  factions: [] as FactionLinkForm[], tags: [] as string[], hidden: false,
};
const EMPTY_FACTION = { name: "", description: "", sort_order: "0" };
const EMPTY_TAG = { name: "" };

function FactionsPanel({ factions, onChanged }: { factions: ShgRolFaction[]; onChanged: () => void }) {
  const [editing, setEditing] = React.useState<ShgRolFaction | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FACTION);
  const [saving, setSaving] = React.useState(false);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FACTION);
    setModalOpen(true);
  }

  function openEdit(f: ShgRolFaction) {
    setEditing(f);
    setForm({ name: f.name, description: f.description ?? "", sort_order: String(f.sort_order) });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/rol/factions/${editing.id}` : "/api/admin/rol/factions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sort_order: Number(form.sort_order) || 0 }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Facción guardada.");
      setModalOpen(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: ShgRolFaction) {
    if (!confirm(`¿Eliminar la facción "${f.name}"? Los NPCs que la tengan asignada la perderán.`)) return;
    const res = await fetch(`/api/admin/rol/factions/${f.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Facción eliminada."); onChanged(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div className="surface-parchment p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink flex items-center gap-1.5">
          <Flag size={14} /> Facciones
        </h2>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nueva facción</Button>
      </div>

      {factions.length === 0 ? (
        <p className="font-body italic text-ink-light text-sm">Todavía no hay facciones cargadas.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {factions.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5 border border-border bg-parchment/60 pl-3 pr-1 py-1.5">
              <span className="font-label text-2xs text-leather-light">#{f.sort_order}</span>
              <span className="font-label text-xs font-semibold text-ink">{f.name}</span>
              <button onClick={() => openEdit(f)} className="p-1 text-leather-light hover:text-brass transition-colors"><Edit2 size={13} /></button>
              <button onClick={() => handleDelete(f)} className="p-1 text-leather-light hover:text-crimson transition-colors"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar facción" : "Nueva facción"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Descripción (opcional)" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input
            label="Orden (menor = primero)"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
          />
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}

// A GM marks a link "Ex-" when the NPC used to belong to that faction but no
// longer does — the same faction can't be added twice (current vs. former is
// one flag per link, not two separate memberships).
function FactionPicker({
  factions, value, onChange,
}: {
  factions: ShgRolFaction[];
  value: FactionLinkForm[];
  onChange: (next: FactionLinkForm[]) => void;
}) {
  const available = factions.filter((f) => !value.some((v) => v.faction_id === f.id));

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Facciones</label>
      {value.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {value.map((v) => {
            const faction = factions.find((f) => f.id === v.faction_id);
            return (
              <div key={v.faction_id} className="flex items-center gap-2 border border-border bg-parchment/60 px-3 py-1.5">
                <span className="font-body text-sm text-ink flex-1">
                  {v.is_former ? `Ex-${faction?.name ?? "?"}` : faction?.name ?? "?"}
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-brass"
                    checked={v.is_former}
                    onChange={(e) => onChange(value.map((x) => (x.faction_id === v.faction_id ? { ...x, is_former: e.target.checked } : x)))}
                  />
                  <span className="font-label text-2xs uppercase tracking-wide text-leather-light">Ex-</span>
                </label>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x.faction_id !== v.faction_id))}
                  className="text-leather-light hover:text-crimson"
                  aria-label="Quitar facción"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {available.length > 0 && (
        <Select
          value=""
          onChange={(e) => {
            if (e.target.value) onChange([...value, { faction_id: e.target.value, is_former: false }]);
          }}
        >
          <option value="">+ Agregar facción…</option>
          {available.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </Select>
      )}
    </div>
  );
}

// A separate catalog from factions — plain descriptive role tags (merchant,
// militia, ...) any NPC can carry any number of, with no "Ex-" concept.
function TagsPanel({ tags, onChanged }: { tags: ShgRolNpcTag[]; onChanged: () => void }) {
  const [editing, setEditing] = React.useState<ShgRolNpcTag | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_TAG);
  const [saving, setSaving] = React.useState(false);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_TAG);
    setModalOpen(true);
  }

  function openEdit(t: ShgRolNpcTag) {
    setEditing(t);
    setForm({ name: t.name });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/rol/npc-tags/${editing.id}` : "/api/admin/rol/npc-tags", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Tag guardado.");
      setModalOpen(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: ShgRolNpcTag) {
    if (!confirm(`¿Eliminar el tag "${t.name}"? Los NPCs que lo tengan lo perderán.`)) return;
    const res = await fetch(`/api/admin/rol/npc-tags/${t.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Tag eliminado."); onChanged(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div className="surface-parchment p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink flex items-center gap-1.5">
          <Tag size={14} /> Tags (rol/ocupación)
        </h2>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo tag</Button>
      </div>

      {tags.length === 0 ? (
        <p className="font-body italic text-ink-light text-sm">Todavía no hay tags cargados — ej. mercader, milicia.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 border border-border bg-parchment/60 pl-3 pr-1 py-1.5">
              <span className="font-label text-xs font-semibold text-ink">{t.name}</span>
              <button onClick={() => openEdit(t)} className="p-1 text-leather-light hover:text-brass transition-colors"><Edit2 size={13} /></button>
              <button onClick={() => handleDelete(t)} className="p-1 text-leather-light hover:text-crimson transition-colors"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar tag" : "Nuevo tag"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ name: e.target.value })} />
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}

function TagPicker({
  tags, value, onChange,
}: {
  tags: ShgRolNpcTag[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((t) => t !== name) : [...value, name]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Tags</label>
      {tags.length === 0 ? (
        <p className="font-body text-xs text-ink-light">Todavía no hay tags predefinidos — cargalos arriba primero.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto border border-border p-2 bg-parchment/40">
          {tags.map((t) => (
            <button
              key={t.id} type="button" onClick={() => toggle(t.name)}
              className={cn(
                "font-label text-2xs px-2.5 py-1 border rounded-sm transition-colors",
                value.includes(t.name) ? "bg-brass text-parchment border-brass" : "border-border text-ink-light hover:border-brass"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageUploadField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = React.useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al subir imagen."); return; }
      onChange(json.data.url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-16 shrink-0 bg-parchment-dark/40 border border-brass/30 flex items-center justify-center overflow-hidden">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <Contact size={20} className="text-leather-light" />
          )}
        </div>
        <label className="flex items-center gap-2 border border-dashed border-border px-3 py-2 cursor-pointer hover:border-brass transition-colors text-xs font-body text-ink-light flex-1">
          <Upload size={14} />
          {uploading ? "Subiendo…" : value ? "Cambiar" : "Subir"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>
        {value && (
          <button type="button" onClick={() => onChange("")} className="text-leather-light hover:text-crimson" aria-label={`Quitar ${label.toLowerCase()}`}>
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export function NpcsManager() {
  const [npcs, setNpcs] = React.useState<NpcRow[]>([]);
  const [factions, setFactions] = React.useState<ShgRolFaction[]>([]);
  const [npcTags, setNpcTags] = React.useState<ShgRolNpcTag[]>([]);
  const [locations, setLocations] = React.useState<ShgRolLocation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<NpcRow | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_NPC);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [npcRes, facRes, tagRes, locRes] = await Promise.all([
      fetch("/api/admin/rol/npcs"),
      fetch("/api/admin/rol/factions"),
      fetch("/api/admin/rol/npc-tags"),
      fetch("/api/admin/rol/locations"),
    ]);
    const npcJson = await npcRes.json();
    if (!npcRes.ok) toast.error(npcJson.error ?? "No se pudieron cargar los NPCs.");
    setNpcs(npcJson.data ?? []);
    setFactions((await facRes.json()).data ?? []);
    setNpcTags((await tagRes.json()).data ?? []);
    setLocations((await locRes.json()).data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_NPC);
    setModalOpen(true);
  }

  function openEdit(n: NpcRow) {
    setEditing(n);
    setForm({
      name: n.name,
      description: n.description,
      residence_location_id: oneOf(n.residence)?.id ?? "",
      origin_location_id: oneOf(n.origin)?.id ?? "",
      standing: n.standing,
      portrait_url: n.portrait_url ?? "",
      full_body_url: n.full_body_url ?? "",
      factions: n.factions
        .map((fl) => ({ faction_id: oneOf(fl.faction)?.id ?? "", is_former: fl.is_former }))
        .filter((f) => f.faction_id),
      tags: n.tags,
      hidden: n.hidden,
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        residence_location_id: form.residence_location_id || null,
        origin_location_id: form.origin_location_id || null,
        standing: form.standing,
        portrait_url: form.portrait_url || null,
        full_body_url: form.full_body_url || null,
        factions: form.factions,
        tags: form.tags,
        hidden: form.hidden,
      };
      const res = await fetch(editing ? `/api/admin/rol/npcs/${editing.id}` : "/api/admin/rol/npcs", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("NPC guardado.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(n: NpcRow) {
    if (!confirm(`¿Eliminar al NPC "${n.name}"?`)) return;
    const res = await fetch(`/api/admin/rol/npcs/${n.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("NPC eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  // The PATCH endpoint takes the full npc record (not a partial patch, so
  // faction/tag lists always stay in sync with what's on screen) — rebuild
  // it from the row instead of opening the edit modal just to flip one flag.
  async function toggleHidden(n: NpcRow) {
    const res = await fetch(`/api/admin/rol/npcs/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: n.name,
        description: n.description,
        residence_location_id: oneOf(n.residence)?.id ?? null,
        origin_location_id: oneOf(n.origin)?.id ?? null,
        standing: n.standing,
        portrait_url: n.portrait_url,
        full_body_url: n.full_body_url,
        factions: n.factions
          .map((fl) => ({ faction_id: oneOf(fl.faction)?.id ?? "", is_former: fl.is_former }))
          .filter((f) => f.faction_id),
        tags: n.tags,
        hidden: !n.hidden,
      }),
    });
    if (res.ok) { toast.success(n.hidden ? "NPC visible para jugadores." : "NPC oculto para jugadores."); load(); }
    else toast.error("No se pudo actualizar.");
  }

  return (
    <div>
      <FactionsPanel factions={factions} onChanged={load} />
      <TagsPanel tags={npcTags} onChanged={load} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-parchment">NPCs</h1>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo NPC</Button>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : npcs.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay NPCs cargados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {npcs.map((n) => {
            const residence = oneOf(n.residence);
            const origin = oneOf(n.origin);
            return (
              <div key={n.id} className={cn("surface-parchment p-4", n.hidden && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative size-9 shrink-0 rounded-full bg-brass/15 flex items-center justify-center overflow-hidden">
                      {n.portrait_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
                        <img src={n.portrait_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Contact size={16} className="text-brass" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <p className="font-label text-sm font-bold text-ink">{n.name}</p>
                        <span className={cn("font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm", badgeClassForStanding(n.standing))}>
                          {labelForStanding(n.standing)}
                        </span>
                        {n.hidden && (
                          <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-crimson/10 text-crimson">
                            Oculto
                          </span>
                        )}
                        {residence && (
                          <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                            Vive en {residence.name}
                          </span>
                        )}
                        {origin && (
                          <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                            De {origin.name}
                          </span>
                        )}
                        {n.factions.map((fl) => {
                          const faction = oneOf(fl.faction);
                          if (!faction) return null;
                          return (
                            <span
                              key={faction.id}
                              className={cn(
                                "font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm",
                                fl.is_former ? "bg-border/40 text-ink-light" : "bg-moss/10 text-moss-dark"
                              )}
                            >
                              {fl.is_former ? `Ex-${faction.name}` : faction.name}
                            </span>
                          );
                        })}
                        {n.tags.map((tag) => (
                          <span key={tag} className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/10 text-brass">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="font-body text-xs text-ink-light line-clamp-2">{n.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleHidden(n)}
                      className="p-1.5 text-leather-light hover:text-brass transition-colors"
                      title={n.hidden ? "Mostrar a los jugadores" : "Ocultar a los jugadores"}
                    >
                      {n.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button onClick={() => openEdit(n)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(n)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar NPC" : "Nuevo NPC"} className="max-w-lg">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Descripción" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="grid grid-cols-2 gap-3">
            <ImageUploadField label="Retrato" value={form.portrait_url} onChange={(url) => setForm((f) => ({ ...f, portrait_url: url }))} />
            <ImageUploadField label="Cuerpo completo" value={form.full_body_url} onChange={(url) => setForm((f) => ({ ...f, full_body_url: url }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Residencia actual (opcional)" value={form.residence_location_id} onChange={(e) => setForm({ ...form, residence_location_id: e.target.value })}>
              <option value="">Ninguna</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
            <Select label="Origen (opcional)" value={form.origin_location_id} onChange={(e) => setForm({ ...form, origin_location_id: e.target.value })}>
              <option value="">Ninguno</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </div>

          <FactionPicker factions={factions} value={form.factions} onChange={(next) => setForm({ ...form, factions: next })} />
          <TagPicker tags={npcTags} value={form.tags} onChange={(next) => setForm({ ...form, tags: next })} />

          <Select
            label="Actitud hacia el gremio"
            required
            value={form.standing}
            onChange={(e) => setForm({ ...form, standing: e.target.value as RolNpcStanding })}
          >
            {NPC_STANDINGS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.hidden} onChange={(e) => setForm({ ...form, hidden: e.target.checked })} className="accent-brass" />
            <span className={cn("font-label text-xs uppercase tracking-wide", form.hidden ? "text-crimson" : "text-leather-light")}>
              {form.hidden ? "Oculto para jugadores" : "Visible para jugadores"}
            </span>
          </label>

          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
