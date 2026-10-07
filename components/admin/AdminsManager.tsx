"use client";

import * as React from "react";
import { Plus, UserCog, KeyRound, Link2, Search } from "lucide-react";
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
  user_id: string | null;
  role: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface LinkableUser {
  id: string;
  email: string;
  name: string | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const EMPTY = { role_id: "" };

export function AdminsManager() {
  const [admins, setAdmins] = React.useState<AdminRow[]>([]);
  const [roles, setRoles] = React.useState<ShgSecurityRole[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [userQuery, setUserQuery] = React.useState("");
  const [userResults, setUserResults] = React.useState<LinkableUser[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<LinkableUser | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [resetTarget, setResetTarget] = React.useState<AdminRow | null>(null);
  const [resetValue, setResetValue] = React.useState("");
  const [resetting, setResetting] = React.useState(false);

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

  React.useEffect(() => {
    if (userQuery.trim().length < 2) { setUserResults([]); return; }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/admins/linkable-users?q=${encodeURIComponent(userQuery.trim())}`);
        setUserResults((await res.json()).data ?? []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [userQuery]);

  function openNew() {
    setForm({ role_id: roles[0]?.id ?? "" });
    setSelectedUser(null);
    setUserQuery("");
    setUserResults([]);
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) { toast.error("Elegí un usuario."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUser.id, role_id: form.role_id }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al crear."); return; }
      toast.success("Administrador creado — entra con su contraseña de usuario habitual.");
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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetValue.trim().length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres."); return; }

    setResetting(true);
    try {
      const res = await fetch(`/api/admin/admins/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: resetValue }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al restablecer."); return; }
      toast.success("Contraseña restablecida. Comunicásela por otro medio.");
      setResetTarget(null);
      setResetValue("");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl text-parchment">Administradores</h1>
        <Button size="sm" onClick={openNew} disabled={roles.length === 0}><Plus size={14} className="mr-1" />Nuevo administrador</Button>
      </div>
      <p className="font-body text-sm text-parchment-dark mb-6">
        Un nuevo administrador se otorga a una cuenta de usuario ya existente — entra a /admin/login con
        esa misma contraseña, sin necesidad de una nueva. Asignale un rol para definir a qué puede
        acceder — administrá los roles desde <a href="/admin/settings" className="underline">Configuración → Roles</a>.
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
                      {a.user_id && (
                        <span title="Usa la contraseña de su cuenta de usuario" className="flex items-center gap-1 font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-moss/15 text-moss-dark">
                          <Link2 size={10} /> Vinculada
                        </span>
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
                  {!a.user_id && (
                    <button
                      type="button"
                      onClick={() => { setResetTarget(a); setResetValue(""); }}
                      className="p-1.5 text-leather-light hover:text-brass transition-colors"
                      aria-label="Restablecer contraseña"
                    >
                      <KeyRound size={15} />
                    </button>
                  )}
                  <Button size="sm" variant={a.is_active ? "danger" : "secondary"} disabled={busyId === a.id} onClick={() => toggleActive(a)}>
                    {a.is_active ? "Desactivar" : "Reactivar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo administrador" closeOnBackdropClick={false}>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Usuario</label>
            {selectedUser ? (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border border-brass bg-brass/10 rounded-sm">
                <div className="min-w-0">
                  <p className="font-body text-sm text-ink truncate">{selectedUser.name ?? selectedUser.email}</p>
                  <p className="font-body text-xs text-ink-light truncate">{selectedUser.email}</p>
                </div>
                <button type="button" onClick={() => setSelectedUser(null)} className="shrink-0 font-label text-2xs uppercase text-brass hover:text-brass-bright">
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Buscar por email o nombre…"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  autoFocus
                />
                {userQuery.trim().length >= 2 && (
                  <div className="border border-border rounded-sm max-h-48 overflow-y-auto">
                    {searching ? (
                      <p className="p-3 font-body text-sm italic text-ink-light">Buscando…</p>
                    ) : userResults.length === 0 ? (
                      <p className="p-3 font-body text-sm italic text-ink-light">Sin resultados.</p>
                    ) : (
                      userResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { setSelectedUser(u); setUserQuery(""); setUserResults([]); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-brass/10 border-t border-border/60 first:border-t-0"
                        >
                          <Search size={13} className="shrink-0 text-leather-light" />
                          <div className="min-w-0">
                            <p className="font-body text-sm text-ink truncate">{u.name ?? u.email}</p>
                            <p className="font-body text-xs text-ink-light truncate">{u.email}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
            <p className="font-body text-2xs text-ink-light/70">
              Solo aparecen usuarios que todavía no son administradores.
            </p>
          </div>
          <Select label="Rol" required value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
            <option value="">Elegí un rol…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <Button type="submit" loading={saving} disabled={!selectedUser} className="mt-2">Crear</Button>
        </form>
      </Modal>

      <Modal open={Boolean(resetTarget)} onClose={() => setResetTarget(null)} title={`Restablecer contraseña — ${resetTarget?.name ?? ""}`}>
        <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
          <Input
            label="Nueva contraseña"
            type="text"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            value={resetValue}
            onChange={(e) => setResetValue(e.target.value)}
          />
          <Button type="submit" loading={resetting} className="mt-1">Restablecer</Button>
        </form>
      </Modal>
    </div>
  );
}
