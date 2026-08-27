"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Flag, Contact } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NPC_STANDINGS, labelForStanding, badgeClassForStanding } from "@/lib/rol/npcStandings";
import type { ShgRolFaction, ShgRolLocation, RolNpcStanding } from "@/types/database";

interface NpcRow {
  id:          string;
  name:        string;
  description: string;
  standing:    RolNpcStanding;
  residence:   { id: string; name: string } | { id: string; name: string }[] | null;
  faction:     { id: string; name: string } | { id: string; name: string }[] | null;
}

function oneOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const EMPTY_NPC = { name: "", description: "", residence_location_id: "", faction_id: "", standing: "neutral" as RolNpcStanding };
const EMPTY_FACTION = { name: "", description: "" };

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
    setForm({ name: f.name, description: f.description ?? "" });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/rol/factions/${editing.id}` : "/api/admin/rol/factions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    if (!confirm(`¿Eliminar la facción "${f.name}"? Los NPCs que la tengan asignada quedarán sin facción.`)) return;
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
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}

export function NpcsManager() {
  const [npcs, setNpcs] = React.useState<NpcRow[]>([]);
  const [factions, setFactions] = React.useState<ShgRolFaction[]>([]);
  const [locations, setLocations] = React.useState<ShgRolLocation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<NpcRow | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_NPC);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [npcRes, facRes, locRes] = await Promise.all([
      fetch("/api/admin/rol/npcs"),
      fetch("/api/admin/rol/factions"),
      fetch("/api/admin/rol/locations"),
    ]);
    setNpcs((await npcRes.json()).data ?? []);
    setFactions((await facRes.json()).data ?? []);
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
      faction_id: oneOf(n.faction)?.id ?? "",
      standing: n.standing,
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
        faction_id: form.faction_id || null,
        standing: form.standing,
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

  return (
    <div>
      <FactionsPanel factions={factions} onChanged={load} />

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
            const faction = oneOf(n.faction);
            return (
              <div key={n.id} className="surface-parchment p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative size-9 shrink-0 rounded-full bg-brass/15 flex items-center justify-center">
                      <Contact size={16} className="text-brass" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <p className="font-label text-sm font-bold text-ink">{n.name}</p>
                        <span className={cn("font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm", badgeClassForStanding(n.standing))}>
                          {labelForStanding(n.standing)}
                        </span>
                        {residence && (
                          <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                            {residence.name}
                          </span>
                        )}
                        {faction && (
                          <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-moss/10 text-moss-dark">
                            {faction.name}
                          </span>
                        )}
                      </div>
                      <p className="font-body text-xs text-ink-light line-clamp-2">{n.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(n)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(n)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar NPC" : "Nuevo NPC"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Descripción" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select label="Residencia (opcional)" value={form.residence_location_id} onChange={(e) => setForm({ ...form, residence_location_id: e.target.value })}>
            <option value="">Ninguna</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Select label="Facción (opcional)" value={form.faction_id} onChange={(e) => setForm({ ...form, faction_id: e.target.value })}>
            <option value="">Ninguna</option>
            {factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Select
            label="Actitud hacia el gremio"
            required
            value={form.standing}
            onChange={(e) => setForm({ ...form, standing: e.target.value as RolNpcStanding })}
          >
            {NPC_STANDINGS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
