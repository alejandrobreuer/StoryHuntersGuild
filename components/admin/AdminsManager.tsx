"use client";

import * as React from "react";
import { Plus, UserCog } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatting";
import type { ShgSecurityRole } from "@/types/database";

interface AdminRow {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  role: { id: string; name: string } | { id: string; name: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const EMPTY = { email: "", name: "", role_id: "" };

export function AdminsManager() {
  const [admins, setAdmins] = React.useState<AdminRow[]>([]);
  const [roles, setRoles] = React.useState<ShgSecurityRole[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [adminsRes, rolesRes] = await Promise.all([
      fetch("/api/admin/admins"), fetch("/api/admin/roles"),
    ]);
    setAdmins((await adminsRes.json()).data ?? []);
    setRoles((await rolesRes.json()).data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setForm({ email: "", name: "", role_id: roles[0]?.id ?? "" });
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al crear."); return; }
      toast.success("Administrador creado. Ya puede entrar con su email desde /admin/login.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(a: AdminRow, role_id: string) {
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/admin/admins/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al actualizar."); return; }
      toast.success("Rol actualizado.");
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(a: AdminRow) {
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/admin/admins/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !a.is_active }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al actualizar."); return; }
      toast.success(a.is_active ? "Administrador desactivado." : "Administrador reactivado.");
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl text-parchment">Administradores</h1>
        <Button size="sm" onClick={openNew} disabled={roles.length === 0}><Plus size={14} className="mr-1" />Nuevo administrador</Button>
      </div>
      <p className="font-body text-sm text-parchment-dark mb-6">
        Cada cuenta entra con su email desde /admin/login (enlace mágico, sin contraseña). Asignale un
        rol para definir a qué puede acceder — administrá los roles desde{" "}
        <a href="/admin/roles" className="underline">Roles</a>.
      </p>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : admins.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay administradores cargados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {admins.map((a) => {
            const role = one(a.role);
            return (
              <div key={a.id} className="surface-parchment p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="size-9 shrink-0 rounded-full bg-brass/15 flex items-center justify-center">
                    <UserCog size={16} className="text-brass" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-label text-sm font-bold text-ink">{a.name}</p>
                      {!a.is_active && (
                        <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-crimson/15 text-crimson">Inactivo</span>
                      )}
                    </div>
                    <p className="font-body text-xs text-ink-light">{a.email}</p>
                    <p className="font-body text-2xs text-ink-light mt-0.5">
                      {a.last_login_at ? `Último ingreso: ${formatDate(a.last_login_at)}` : "Todavía no ingresó"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    wrapperClassName="min-w-[160px]"
                    value={role?.id ?? ""}
                    disabled={busyId === a.id}
                    onChange={(e) => updateRole(a, e.target.value)}
                  >
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Select>
                  <Button size="sm" variant={a.is_active ? "danger" : "secondary"} disabled={busyId === a.id} onClick={() => toggleActive(a)}>
                    {a.is_active ? "Desactivar" : "Reactivar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo administrador">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label="Rol" required value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
            <option value="">Elegí un rol…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <Button type="submit" loading={saving} className="mt-2">Crear</Button>
        </form>
      </Modal>
    </div>
  );
}
