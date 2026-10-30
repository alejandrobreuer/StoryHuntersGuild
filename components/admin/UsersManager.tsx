"use client";

import * as React from "react";
import Image from "next/image";
import { UserCircle, ChevronDown, ChevronUp, Plus, X, Sparkles, Crown, ScrollText, CalendarCheck, Award, Download, Merge, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatting";
import { currentRank } from "@/lib/gamification/ranks";
import { exportUsers, PARTICIPATION_SOURCE_LABELS } from "@/components/admin/exportUsers";
import type { ShgUserPublic, ShgRank } from "@/types/database";

// Admin › Usuarios also gets the staff-only notes (never sent to players).
type AdminUser = ShgUserPublic & { admin_notes: string | null };

type BadgeRef = { id?: string; name: string; icon: string | null; icon_url: string | null } | null;

interface UserDetails {
  quests: {
    id: string; awarded_xp: number; awarded_rp: number; awarded_at: string;
    quest: { id: string; title: string; type: string; badge: BadgeRef } | null;
  }[];
  participations: { event: { id: string; title: string; starts_at: string }; source: string; date: string; rp: number }[];
  badges: { awarded_at: string; badge: BadgeRef }[];
  options: {
    quests: { id: string; title: string; type: string; status: string; reward_xp: number; reward_rp: number }[];
    events: { id: string; title: string; starts_at: string }[];
  };
}

const QUEST_TYPE_LABELS: Record<string, string> = {
  individual: "Individual", group: "Grupo", event: "Evento", guild: "Gremio",
};


function BadgeIcon({ badge, size = 20 }: { badge: BadgeRef; size?: number }) {
  return (
    <span className="relative shrink-0 rounded-full bg-brass/15 flex items-center justify-center overflow-hidden text-xs" style={{ width: size, height: size }}>
      {badge?.icon_url ? (
        <Image src={badge.icon_url} alt="" fill className="object-cover" sizes={`${size}px`} />
      ) : (
        badge?.icon || <Award size={size * 0.6} className="text-brass" />
      )}
    </span>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 font-label text-2xs font-semibold uppercase tracking-widest text-leather-light mb-2">
      <Icon size={13} /> {children}
    </p>
  );
}

// ─── Expanded card: quests, participations, badges, account ─────────────────

function UserDetail({ user, onUserChanged, onMerge }: {
  user: AdminUser; onUserChanged: (u?: AdminUser) => void; onMerge: () => void;
}) {
  const [details, setDetails] = React.useState<UserDetails | null>(null);
  const [questId, setQuestId] = React.useState("");
  const [questEventId, setQuestEventId] = React.useState("");
  const [eventId, setEventId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [resetting, setResetting] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch(`/api/admin/users/${user.id}/details`);
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "No se pudo cargar el detalle."); return; }
    setDetails(json.data);
  }, [user.id]);

  React.useEffect(() => { load(); }, [load]);

  async function call(url: string, init: RequestInit, success: string) {
    setBusy(true);
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo guardar."); return false; }
      toast.success(success);
      await load();
      onUserChanged();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function addQuest() {
    if (!questId) return;
    const ok = await call(`/api/admin/users/${user.id}/quests`, {
      method: "POST", body: JSON.stringify({ questId, eventId: questEventId || null }),
    }, "Misión agregada y recompensa otorgada.");
    if (ok) { setQuestId(""); setQuestEventId(""); }
  }

  async function removeQuest(r: UserDetails["quests"][number]) {
    if (!confirm(`¿Quitar "${r.quest?.title ?? "esta misión"}"? Se descuentan ${r.awarded_xp} XP y ${r.awarded_rp} RP.`)) return;
    await call(`/api/admin/users/${user.id}/quests/${r.id}`, { method: "DELETE" }, "Misión quitada.");
  }

  async function addEvent() {
    if (!eventId) return;
    const ok = await call(`/api/admin/users/${user.id}/events`, {
      method: "POST", body: JSON.stringify({ eventId }),
    }, "Participación agregada.");
    if (ok) setEventId("");
  }

  async function removeEvent(p: UserDetails["participations"][number]) {
    const rpNote = p.rp > 0 ? ` Se descuentan ${p.rp} RP.` : "";
    if (!confirm(`¿Quitar la participación en "${p.event.title}"?${rpNote}`)) return;
    await call(`/api/admin/users/${user.id}/events/${p.event.id}`, { method: "DELETE" }, "Participación quitada.");
  }

  async function toggleSubscriber() {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_subscriber: !user.is_subscriber }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Error al actualizar."); return; }
    onUserChanged(json.data);
    toast.success(json.data.is_subscriber ? "Suscripción activada." : "Suscripción desactivada.");
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.trim().length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres."); return; }
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: newPassword }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al restablecer."); return; }
      setNewPassword("");
      toast.success("Contraseña restablecida. Comunicásela al usuario por otro medio.");
    } finally {
      setResetting(false);
    }
  }

  if (!details) return <p className="font-body text-sm italic text-ink-light pt-4 mt-3 border-t border-border">Cargando…</p>;

  const participatedIds = new Set(details.participations.map((p) => p.event.id));
  const rowClass = "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-sm bg-parchment-dark/25";
  const removeClass = "p-1 shrink-0 text-leather-light hover:text-crimson transition-colors disabled:opacity-40";

  return (
    <div className="mt-3 pt-4 border-t border-border grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* ── Completed quests ── */}
      <div>
        <SectionTitle icon={ScrollText}>Misiones completadas ({details.quests.length})</SectionTitle>
        {details.quests.length === 0 ? (
          <p className="font-body text-xs italic text-ink-light mb-2">Ninguna todavía.</p>
        ) : (
          <ul className="flex flex-col gap-1 mb-2">
            {details.quests.map((r) => (
              <li key={r.id} className={rowClass}>
                <div className="flex items-center gap-2 min-w-0">
                  {r.quest?.badge && <BadgeIcon badge={r.quest.badge} />}
                  <div className="min-w-0">
                    <p className="font-label text-xs font-semibold text-ink truncate">{r.quest?.title ?? "Misión eliminada"}</p>
                    <p className="font-body text-2xs text-ink-light">
                      {r.quest ? `${QUEST_TYPE_LABELS[r.quest.type] ?? r.quest.type} · ` : ""}+{r.awarded_xp} XP · +{r.awarded_rp} RP · {formatDate(r.awarded_at)}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => removeQuest(r)} disabled={busy} className={removeClass} aria-label="Quitar misión" title="Quitar misión">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2">
          <Select value={questId} onChange={(e) => setQuestId(e.target.value)} aria-label="Misión a agregar">
            <option value="">Agregar misión…</option>
            {details.options.quests.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title} ({QUEST_TYPE_LABELS[q.type] ?? q.type}{q.status === "archived" ? ", archivada" : ""}) · +{q.reward_xp} XP · +{q.reward_rp} RP
              </option>
            ))}
          </Select>
          {questId && (
            <div className="flex items-end gap-2">
              <Select value={questEventId} onChange={(e) => setQuestEventId(e.target.value)} aria-label="Evento (opcional)" wrapperClassName="flex-1">
                <option value="">Sin evento</option>
                {details.options.events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title} · {formatDate(ev.starts_at)}</option>
                ))}
              </Select>
              <Button type="button" size="sm" onClick={addQuest} loading={busy}><Plus size={14} className="mr-1" />Agregar</Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Event participations ── */}
      <div>
        <SectionTitle icon={CalendarCheck}>Participaciones en eventos ({details.participations.length})</SectionTitle>
        {details.participations.length === 0 ? (
          <p className="font-body text-xs italic text-ink-light mb-2">Ninguna todavía.</p>
        ) : (
          <ul className="flex flex-col gap-1 mb-2">
            {details.participations.map((p) => (
              <li key={p.event.id} className={rowClass}>
                <div className="min-w-0">
                  <p className="font-label text-xs font-semibold text-ink truncate">{p.event.title}</p>
                  <p className="font-body text-2xs text-ink-light">
                    {formatDate(p.event.starts_at)} · {PARTICIPATION_SOURCE_LABELS[p.source] ?? p.source}{p.rp > 0 ? ` · +${p.rp} RP` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => removeEvent(p)} disabled={busy} className={removeClass} aria-label="Quitar participación" title="Quitar participación">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <Select value={eventId} onChange={(e) => setEventId(e.target.value)} aria-label="Evento a agregar" wrapperClassName="flex-1">
            <option value="">Agregar participación…</option>
            {details.options.events.filter((ev) => !participatedIds.has(ev.id)).map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title} · {formatDate(ev.starts_at)}</option>
            ))}
          </Select>
          {eventId && <Button type="button" size="sm" onClick={addEvent} loading={busy}><Plus size={14} className="mr-1" />Agregar</Button>}
        </div>
      </div>

      {/* ── Badges + account ── */}
      <div className="flex flex-col gap-5">
        <div>
          <SectionTitle icon={Award}>Insignias ({details.badges.length})</SectionTitle>
          {details.badges.length === 0 ? (
            <p className="font-body text-xs italic text-ink-light">Ninguna todavía.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {details.badges.map((b, i) => (
                <li key={b.badge?.id ?? i} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-parchment-dark/25 font-label text-2xs text-ink" title={formatDate(b.awarded_at)}>
                  <BadgeIcon badge={b.badge} size={16} /> {b.badge?.name ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <SectionTitle icon={UserCircle}>Cuenta</SectionTitle>
          <p className="font-body text-xs text-ink-light -mt-1">
            {user.phone ? `${user.phone} · ` : ""}Alta {formatDate(user.created_at)}
            {user.last_login_at ? ` · Último ingreso ${formatDate(user.last_login_at)}` : ""}
          </p>
          <Button size="sm" variant={user.is_subscriber ? "danger" : "secondary"} onClick={toggleSubscriber}>
            {user.is_subscriber ? "Desactivar suscripción" : "Activar suscripción"}
          </Button>
          <form onSubmit={resetPassword} className="flex items-end gap-2">
            <Input
              label="Restablecer contraseña"
              type="text"
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              wrapperClassName="flex-1"
            />
            <Button type="submit" size="sm" variant="secondary" loading={resetting}>Restablecer</Button>
          </form>
          <p className="font-body text-2xs text-ink-light">
            No hay recuperación por email — comunicale la contraseña temporal por otro medio.
          </p>
          <Button size="sm" variant="ghost" onClick={onMerge}>
            <Merge size={14} className="mr-1" />Fusionar con otra cuenta…
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── List ───────────────────────────────────────────────────────────────────

export function UsersManager() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [ranks, setRanks] = React.useState<ShgRank[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  // XP or RP correction for one user.
  const [adjusting, setAdjusting] = React.useState<{ user: AdminUser; kind: "xp" | "rp" } | null>(null);
  const [adjustValue, setAdjustValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  // Merging two accounts: the one whose card opened it, the other one, and which survives.
  const [merging, setMerging] = React.useState<{ from: AdminUser; otherId: string; keep: "from" | "other" } | null>(null);
  const [mergeQuery, setMergeQuery] = React.useState("");
  const [mergeSaving, setMergeSaving] = React.useState(false);
  // Staff-only note being edited.
  const [noting, setNoting] = React.useState<AdminUser | null>(null);
  const [noteValue, setNoteValue] = React.useState("");
  const [noteSaving, setNoteSaving] = React.useState(false);

  const loadUsers = React.useCallback(async () => {
    const res = await fetch("/api/admin/users");
    setUsers((await res.json()).data ?? []);
  }, []);

  React.useEffect(() => {
    (async () => {
      const ranksRes = await fetch("/api/admin/ranks");
      setRanks((await ranksRes.json()).data ?? []);
      await loadUsers();
      setLoading(false);
    })();
  }, [loadUsers]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q));
  }, [users, query]);

  function replaceUser(u: AdminUser) {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
  }

  function openMerge(u: AdminUser) {
    setMerging({ from: u, otherId: "", keep: "from" });
    setMergeQuery("");
  }

  const mergeOther = merging ? users.find((x) => x.id === merging.otherId) ?? null : null;
  const mergeCandidates = React.useMemo(() => {
    if (!merging) return [];
    const q = mergeQuery.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter((x) => x.id !== merging.from.id)
      .filter((x) => x.email.toLowerCase().includes(q) || (x.name ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [users, merging, mergeQuery]);

  async function applyMerge() {
    if (!merging || !mergeOther) return;
    const keep = merging.keep === "from" ? merging.from : mergeOther;
    const drop = merging.keep === "from" ? mergeOther : merging.from;
    setMergeSaving(true);
    try {
      const res = await fetch("/api/admin/users/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId: keep.id, dropId: drop.id }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudieron fusionar las cuentas."); return; }
      const s = json.data as { duplicate_quests: number; duplicate_events: number };
      const dups = s.duplicate_quests + s.duplicate_events;
      toast.success(`Cuentas fusionadas en ${keep.email}.${dups > 0 ? ` ${dups} duplicado${dups !== 1 ? "s" : ""} contado${dups !== 1 ? "s" : ""} una sola vez.` : ""}`);
      setMerging(null);
      await loadUsers();
      setExpandedId(keep.id);
    } finally {
      setMergeSaving(false);
    }
  }

  function openAdjust(e: React.MouseEvent, user: AdminUser, kind: "xp" | "rp") {
    e.stopPropagation();
    setAdjusting({ user, kind });
    setAdjustValue("");
  }

  async function applyAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!adjusting) return;
    const amount = Number(adjustValue);
    if (!adjustValue.trim() || !Number.isInteger(amount) || amount === 0) {
      toast.error("Ingresá un número entero distinto de 0 (negativo para restar).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${adjusting.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjusting.kind === "xp" ? { adjustXp: amount } : { adjustRp: amount }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al ajustar."); return; }
      replaceUser(json.data);
      setAdjusting(null);
      toast.success("Ajuste aplicado.");
    } finally {
      setSaving(false);
    }
  }

  // Exports what the list shows: every user, or the current search's matches.
  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/users/export");
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo exportar."); return; }
      const today = new Date().toLocaleDateString("en-CA");
      await exportUsers(filtered, ranks, json.data, `usuarios-${today}.xlsx`);
    } catch {
      toast.error("No se pudo exportar.");
    } finally {
      setExporting(false);
    }
  }

  function openNote(e: React.MouseEvent, user: AdminUser) {
    e.stopPropagation();
    setNoting(user);
    setNoteValue(user.admin_notes ?? "");
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noting) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${noting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_notes: noteValue.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo guardar la nota."); return; }
      replaceUser(json.data);
      setNoting(null);
      toast.success("Nota guardada.");
    } finally {
      setNoteSaving(false);
    }
  }

  const adjustLabel = adjusting?.kind === "xp" ? "XP" : "RP";
  const pillButton = "inline-flex items-center gap-1 font-label text-2xs font-semibold uppercase tracking-wide px-2 py-1 rounded-sm border transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-6">
        <h1 className="font-display text-2xl text-parchment">Usuarios</h1>
        <Button size="sm" variant="ghost" onClick={handleExport} loading={exporting} disabled={loading || filtered.length === 0}>
          <Download size={14} className="mr-1" />
          {query.trim() ? `Exportar ${filtered.length} a Excel` : "Exportar a Excel"}
        </Button>
      </div>

      <Input
        wrapperClassName="mb-4 max-w-sm"
        placeholder="Buscar por nombre o email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Ningún usuario coincide.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((u) => {
            const rank = currentRank(u.rp, ranks);
            const expanded = expandedId === u.id;
            return (
              <div key={u.id} className="surface-parchment p-4">
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : u.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedId(expanded ? null : u.id); } }}
                  className="flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserCircle size={28} className="text-leather-light shrink-0" />
                    <div className="min-w-0">
                      <p className="font-label text-sm font-bold text-ink truncate">{u.name || u.email}</p>
                      <p className="font-body text-xs text-ink-light truncate">{u.email}</p>
                      {u.admin_notes && (
                        <p
                          title={u.admin_notes}
                          className="mt-1 flex items-start gap-1 font-body text-xs italic text-leather"
                        >
                          <StickyNote size={12} className="mt-0.5 shrink-0 text-brass" />
                          <span className="min-w-0 whitespace-pre-line line-clamp-2">{u.admin_notes}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={(e) => openNote(e, u)}
                      title={u.admin_notes ? "Editar nota" : "Agregar nota (sólo la ven los administradores)"}
                      className={cn(pillButton, "border-leather/30 text-leather-light hover:bg-leather/10", u.admin_notes && "text-leather")}
                    >
                      <StickyNote size={12} /> Nota
                    </button>
                    {u.is_subscriber && (
                      <span className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-brass/15 text-brass">
                        Suscriptor
                      </span>
                    )}
                    {rank && (
                      <span className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-moss/15 text-moss-dark">
                        {rank.name}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => openAdjust(e, u, "xp")}
                      title="Sumar o restar XP"
                      className={cn(pillButton, "border-brass/40 text-brass hover:bg-brass/10")}
                    >
                      <Sparkles size={12} /> {u.xp} XP
                    </button>
                    <button
                      type="button"
                      onClick={(e) => openAdjust(e, u, "rp")}
                      title="Sumar o restar RP"
                      className={cn(pillButton, "border-moss/40 text-moss-dark hover:bg-moss/10")}
                    >
                      <Crown size={12} /> {u.rp} RP
                    </button>
                    {expanded ? <ChevronUp size={16} className="text-leather-light" /> : <ChevronDown size={16} className="text-leather-light" />}
                  </div>
                </div>
                {expanded && (
                  <UserDetail
                    user={u}
                    onUserChanged={(updated) => (updated ? replaceUser(updated) : loadUsers())}
                    onMerge={() => openMerge(u)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(adjusting)}
        onClose={() => setAdjusting(null)}
        title={adjusting ? `Ajustar ${adjustLabel} — ${adjusting.user.name || adjusting.user.email}` : "Ajustar"}
      >
        {adjusting && (
          <form onSubmit={applyAdjustment} className="flex flex-col gap-3">
            <p className="font-body text-sm text-ink-light">
              Actual: <span className="text-ink font-semibold">{adjusting.kind === "xp" ? adjusting.user.xp : adjusting.user.rp} {adjustLabel}</span>.
              Usá un número negativo para restar.
            </p>
            <Input
              label={`Sumar / restar ${adjustLabel}`}
              type="number"
              step={1}
              autoFocus
              placeholder={adjusting.kind === "xp" ? "ej: 10 o -10" : "ej: 2 o -2"}
              value={adjustValue}
              onChange={(e) => setAdjustValue(e.target.value)}
            />
            <Button type="submit" size="sm" loading={saving}>Aplicar ajuste</Button>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(noting)}
        onClose={() => setNoting(null)}
        title={noting ? `Nota — ${noting.name || noting.email}` : "Nota"}
      >
        {noting && (
          <form onSubmit={saveNote} className="flex flex-col gap-3">
            <p className="font-body text-sm text-ink-light">
              Sólo la ven los administradores; el usuario nunca la ve. Dejala vacía para borrarla.
            </p>
            <Textarea
              label="Nota"
              rows={5}
              autoFocus
              maxLength={2000}
              placeholder="ej: tiene otra cuenta con su email del trabajo"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
            />
            <Button type="submit" size="sm" loading={noteSaving}>Guardar nota</Button>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(merging)}
        onClose={() => setMerging(null)}
        title="Fusionar cuentas"
        className="max-w-xl"
        closeOnBackdropClick={false}
      >
        {merging && (
          <div className="flex flex-col gap-4">
            {!mergeOther ? (
              <>
                <p className="font-body text-sm text-ink-light">
                  ¿Con qué cuenta se fusiona <strong className="text-ink">{merging.from.name || merging.from.email}</strong>?
                </p>
                <Input
                  placeholder="Buscar por nombre o email…"
                  autoFocus
                  value={mergeQuery}
                  onChange={(e) => setMergeQuery(e.target.value)}
                />
                {mergeQuery.trim() && (mergeCandidates.length === 0 ? (
                  <p className="font-body text-xs italic text-ink-light">Ninguna cuenta coincide.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {mergeCandidates.map((x) => (
                      <li key={x.id}>
                        <button
                          type="button"
                          onClick={() => setMerging({ ...merging, otherId: x.id })}
                          className="w-full text-left px-3 py-2 rounded-sm border border-border hover:border-brass transition-colors"
                        >
                          <p className="font-label text-sm font-semibold text-ink">{x.name || x.email}</p>
                          <p className="font-body text-xs text-ink-light">{x.email} · {x.xp} XP · {x.rp} RP</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ))}
              </>
            ) : (
              <>
                <p className="font-body text-sm text-ink-light">Elegí la cuenta que queda (su email es con el que se va a entrar):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([["from", merging.from], ["other", mergeOther]] as const).map(([side, x]) => {
                    const chosen = merging.keep === side;
                    return (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setMerging({ ...merging, keep: side })}
                        className={cn(
                          "text-left p-3 rounded-sm border-2 transition-colors",
                          chosen ? "border-moss bg-moss/10" : "border-border border-dashed opacity-70 hover:opacity-100"
                        )}
                      >
                        <p className={cn("font-label text-2xs font-semibold uppercase tracking-widest mb-1", chosen ? "text-moss-dark" : "text-crimson")}>
                          {chosen ? "Queda" : "Se elimina"}
                        </p>
                        <p className="font-label text-sm font-bold text-ink truncate">{x.name || "—"}</p>
                        <p className="font-body text-xs text-ink-light truncate">{x.email}</p>
                        <p className="font-body text-xs text-ink-light mt-1">{x.xp} XP · {x.rp} RP · alta {formatDate(x.created_at)}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="font-body text-xs text-ink-light leading-relaxed px-3 py-2 rounded-sm bg-parchment-dark/25">
                  Todo lo de la cuenta que se elimina — misiones, participaciones en eventos, reservas, insignias, personajes,
                  XP y RP — pasa a la que queda. Lo que esté en las dos (la misma misión o el mismo evento) se cuenta
                  una sola vez y se descuenta su XP/RP repetido. <strong className="text-crimson">No se puede deshacer.</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMerging({ ...merging, otherId: "" })}>
                    Elegir otra cuenta
                  </Button>
                  <Button type="button" size="sm" variant="danger" loading={mergeSaving} onClick={applyMerge}>
                    <Merge size={14} className="mr-1" />Fusionar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
