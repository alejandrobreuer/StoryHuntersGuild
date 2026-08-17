"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { ShgSecurityRole } from "@/types/database";

type RoleForm = Pick<
  ShgSecurityRole,
  "name" | "description" | "can_access_admin" | "perm_events" | "perm_venues" | "perm_games" |
  "perm_tags" | "perm_users" | "perm_quests" | "perm_turn_ins" | "perm_ranks" | "perm_badges" |
  "perm_feature_flags" | "perm_bookings" | "perm_reports" | "perm_settings" | "perm_roles" | "perm_rol"
>;

const EMPTY: RoleForm = {
  name: "", description: "", can_access_admin: true,
  perm_events: false, perm_venues: false, perm_games: false, perm_tags: false, perm_users: false,
  perm_quests: false, perm_turn_ins: false, perm_ranks: false, perm_badges: false, perm_feature_flags: false,
  perm_bookings: false, perm_reports: false, perm_settings: false, perm_roles: false, perm_rol: false,
};

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`shrink-0 relative h-6 w-11 rounded-full transition-colors ${on ? "bg-moss" : "bg-leather-light/40"}`}
      aria-pressed={on}
      aria-label={label}
    >
      <span className={`absolute top-1 size-4 rounded-full bg-parchment transition-transform ${on ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

export function RolesManager() {
  const [roles, setRoles] = React.useState<ShgSecurityRole[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ShgSecurityRole | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<RoleForm>(EMPTY);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/roles");
    const json = await res.json();
    setRoles(json.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(r: ShgSecurityRole) {
    setEditing(r);
    setForm({
      name: r.name, description: r.description ?? "", can_access_admin: r.can_access_admin,
      perm_events: r.perm_events, perm_venues: r.perm_venues, perm_games: r.perm_games,
      perm_tags: r.perm_tags, perm_users: r.perm_users, perm_quests: r.perm_quests,
      perm_turn_ins: r.perm_turn_ins,
      perm_ranks: r.perm_ranks, perm_badges: r.perm_badges, perm_feature_flags: r.perm_feature_flags,
      perm_bookings: r.perm_bookings, perm_reports: r.perm_reports, perm_settings: r.perm_settings,
      perm_roles: r.perm_roles, perm_rol: r.perm_rol,
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/roles/${editing.id}` : "/api/admin/roles", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Rol guardado.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r: ShgSecurityRole) {
    if (!confirm(`¿Eliminar el rol "${r.name}"?`)) return;
    const res = await fetch(`/api/admin/roles/${r.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (res.ok) { toast.success("Rol eliminado."); load(); }
    else toast.error(json.error ?? "No se pudo eliminar.");
  }

  const permCount = (r: ShgSecurityRole) => PERMISSIONS.filter((p) => r[p.column]).length;

  return (
    <div>
      <div className="flex items-center justify-end mb-2">
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo rol</Button>
      </div>
      <p className="font-body text-sm text-parchment-dark mb-6">
        Cada rol controla el acceso al panel de administración y a cada sección por separado. Asigná
        roles a cuentas concretas desde{" "}
        <a href="/admin/admins" className="underline">Administradores</a>.
      </p>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : roles.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay roles cargados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {roles.map((r) => (
            <div key={r.id} className="surface-parchment p-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="size-9 shrink-0 rounded-full bg-brass/15 flex items-center justify-center">
                  <ShieldCheck size={16} className="text-brass" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-label text-sm font-bold text-ink">{r.name}</p>
                    <span className={`font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${r.can_access_admin ? "bg-moss/15 text-moss-dark" : "bg-crimson/15 text-crimson"}`}>
                      {r.can_access_admin ? "Acceso al panel" : "Sin acceso al panel"}
                    </span>
                    <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/15 text-brass">
                      {permCount(r)} / {PERMISSIONS.length} secciones
                    </span>
                  </div>
                  {r.description && <p className="font-body text-xs text-ink-light">{r.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(r)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(r)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar rol" : "Nuevo rol"} className="max-w-lg max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Descripción (opcional)" rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="flex items-center justify-between gap-3 py-2 border-y border-border">
            <div>
              <p className="font-label text-sm font-bold text-ink">Acceso al panel de administración</p>
              <p className="font-body text-xs text-ink-light">Si está apagado, este rol no puede entrar al panel bajo ningún concepto.</p>
            </div>
            <Toggle on={form.can_access_admin} onToggle={() => setForm({ ...form, can_access_admin: !form.can_access_admin })} label="Acceso al panel" />
          </div>

          <div>
            <p className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light mb-2">Secciones habilitadas</p>
            <div className="flex flex-col gap-1.5">
              {PERMISSIONS.map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-3">
                  <span className="font-body text-sm text-ink">{p.label}</span>
                  <Toggle
                    on={form[p.column] as boolean}
                    onToggle={() => setForm({ ...form, [p.column]: !form[p.column] })}
                    label={p.label}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
