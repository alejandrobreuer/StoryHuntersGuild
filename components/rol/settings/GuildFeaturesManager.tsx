"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ShgRolGuildFeature, ShgRolGuildStatus } from "@/types/database";

const EMPTY = { title: "", description: "", benefit: "", unlocked: false, sort_order: "0", guild_status_id: "", cost_supplies: "0" };

export function GuildFeaturesManager({ refreshKey }: { refreshKey?: number } = {}) {
  const [features, setFeatures] = React.useState<ShgRolGuildFeature[]>([]);
  const [statuses, setStatuses] = React.useState<ShgRolGuildStatus[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgRolGuildFeature | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [featRes, statusRes] = await Promise.all([
      fetch("/api/admin/rol/guild-features"),
      fetch("/api/admin/rol/guild-statuses"),
    ]);
    setFeatures((await featRes.json()).data ?? []);
    setStatuses((await statusRes.json()).data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load, refreshKey]);

  const statusById = React.useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(f: ShgRolGuildFeature) {
    setEditing(f);
    setForm({
      title: f.title, description: f.description, benefit: f.benefit ?? "",
      unlocked: f.unlocked, sort_order: String(f.sort_order),
      guild_status_id: f.guild_status_id ?? "", cost_supplies: String(f.cost_supplies),
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/rol/guild-features/${editing.id}` : "/api/admin/rol/guild-features", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sort_order: Number(form.sort_order) || 0,
          cost_supplies: Number(form.cost_supplies) || 0,
          guild_status_id: form.guild_status_id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Función guardada.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta función del gremio?")) return;
    const res = await fetch(`/api/admin/rol/guild-features/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Función eliminada."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div className="surface-parchment p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink">Funciones del gremio</h2>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nueva función</Button>
      </div>

      {loading ? (
        <p className="font-body italic text-ink-light text-sm">Cargando…</p>
      ) : features.length === 0 ? (
        <p className="font-body italic text-ink-light text-sm">Todavía no hay funciones cargadas.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {features.map((f) => {
            const requiredStatus = f.guild_status_id ? statusById.get(f.guild_status_id) : null;
            return (
              <div key={f.id} className="border border-border bg-parchment/40 p-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    {f.unlocked ? <Unlock size={13} className="text-moss shrink-0" /> : <Lock size={13} className="text-leather-light shrink-0" />}
                    <p className="font-label text-sm font-bold text-ink">{f.title}</p>
                  </div>
                  <p className="font-body text-xs text-ink-light">{f.description}</p>
                  {f.benefit && <p className="font-body text-xs text-brass mt-1">{f.benefit}</p>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {f.cost_supplies > 0 && (
                      <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                        {f.supplies_allocated}/{f.cost_supplies} suministros
                      </span>
                    )}
                    {requiredStatus && (
                      <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-moss/10 text-moss-dark">
                        Requiere: {requiredStatus.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(f)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                  <button onClick={() => handleDelete(f.id)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar función" : "Nueva función"}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Título" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Descripción" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Beneficio destacado (opcional)" value={form.benefit} onChange={(e) => setForm({ ...form, benefit: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Estado del gremio requerido" value={form.guild_status_id} onChange={(e) => setForm({ ...form, guild_status_id: e.target.value })}>
              <option value="">Ninguno</option>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input label="Costo en suministros" type="number" min={0} value={form.cost_supplies} onChange={(e) => setForm({ ...form, cost_supplies: e.target.value })} />
          </div>
          <Input label="Orden" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.unlocked} onChange={(e) => setForm({ ...form, unlocked: e.target.checked })} className="accent-brass" />
            <span className={cn("font-label text-xs uppercase tracking-wide", form.unlocked ? "text-moss" : "text-leather-light")}>
              {form.unlocked ? "Desbloqueada" : "Bloqueada"}
            </span>
          </label>
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
