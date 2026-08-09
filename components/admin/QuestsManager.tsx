"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ShgQuest, ShgBadge, ShgUserPublic, QuestType, QuestStatus } from "@/types/database";

interface QuestRow extends ShgQuest {
  badge: { id: string; name: string; icon: string | null; icon_url: string | null } | null;
}
interface EventOption { id: string; title: string; }
interface CompletionRow {
  id: string; user_id: string; contribution_amount: number; created_at: string;
  user: { id: string; email: string; name: string | null } | null;
}
interface RewardRow {
  user_id: string; awarded_xp: number; awarded_rp: number; awarded_at: string;
  user: { id: string; email: string; name: string | null } | null;
}

const TYPE_LABELS: Record<QuestType, string> = {
  individual: "Individual", party: "Grupo", community: "Comunitaria", event: "Evento",
};
const STATUS_LABELS: Record<QuestStatus, string> = { draft: "Borrador", active: "Activa", archived: "Archivada" };

const EMPTY = {
  title: "", narrative: "", type: "individual" as QuestType, status: "draft" as QuestStatus,
  reward_xp: 10, reward_rp: 0, badge_id: "", goal_count: "", starts_at: "", ends_at: "", event_id: "",
};

function userLabel(u: { email: string; name: string | null }): string {
  return u.name ? `${u.name} (${u.email})` : u.email;
}

function QuestDetail({ quest, users }: { quest: QuestRow; users: ShgUserPublic[] }) {
  const [completions, setCompletions] = React.useState<CompletionRow[] | null>(null);
  const [rewards, setRewards] = React.useState<RewardRow[] | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [amount, setAmount] = React.useState(1);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch(`/api/admin/quests/${quest.id}/completions`);
    const json = await res.json();
    setCompletions(json.data?.completions ?? []);
    setRewards(json.data?.rewards ?? []);
  }, [quest.id]);

  React.useEffect(() => { load(); }, [load]);

  async function markComplete() {
    if (!selectedUserId) { toast.error("Elegí un usuario."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quests/${quest.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error."); return; }
      toast.success("Misión completada y recompensa otorgada.");
      setSelectedUserId("");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function logContribution() {
    if (!selectedUserId) { toast.error("Elegí un usuario."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quests/${quest.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, amount }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error."); return; }
      toast.success("Contribución registrada.");
      setSelectedUserId("");
      setAmount(1);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function rewardContributors() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quests/${quest.id}/reward-contributors`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error."); return; }
      toast.success(`Se recompensó a ${json.data.rewardedCount} contribuyente(s).`);
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!completions || !rewards) {
    return <p className="font-body text-xs italic text-ink-light">Cargando…</p>;
  }

  const totalContributions = completions.reduce((sum, c) => sum + c.contribution_amount, 0);
  const rewardedIds = new Set(rewards.map((r) => r.user_id));
  const pendingCount = new Set(completions.map((c) => c.user_id)).size - rewardedIds.size;

  return (
    <div className="flex flex-col gap-4 pt-3 border-t border-border">
      {quest.type === "community" ? (
        <>
          <div>
            <div className="flex items-center justify-between font-label text-2xs uppercase tracking-widest text-leather-light mb-1">
              <span>Progreso</span>
              <span>{totalContributions} / {quest.goal_count ?? "—"}</span>
            </div>
            <div className="h-2 w-full bg-parchment-dark/40 overflow-hidden rounded-full">
              <div
                className="h-full bg-moss transition-all"
                style={{ width: `${quest.goal_count ? Math.min(100, (totalContributions / quest.goal_count) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Select wrapperClassName="flex-1 min-w-[180px]" label="Registrar contribución de" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">Elegí un usuario…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
            </Select>
            <Input wrapperClassName="w-24" label="Cantidad" type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <Button size="sm" onClick={logContribution} loading={busy}>Registrar</Button>
          </div>

          <Button size="sm" variant="secondary" onClick={rewardContributors} loading={busy} disabled={totalContributions === 0}>
            Recompensar contribuyentes {pendingCount > 0 ? `(${pendingCount} pendientes)` : ""}
          </Button>

          {completions.length > 0 && (
            <div>
              <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">Contribuciones</p>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {completions.map((c) => (
                  <div key={c.id} className="font-body text-xs text-ink-light flex items-center justify-between">
                    <span>{c.user ? userLabel(c.user) : "—"}</span>
                    <span>+{c.contribution_amount} {rewardedIds.has(c.user_id) && "· recompensado"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <Select wrapperClassName="flex-1 min-w-[180px]" label="Completar para" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">Elegí un usuario…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
            </Select>
            <Button size="sm" onClick={markComplete} loading={busy}>Marcar completada</Button>
          </div>

          {rewards.length > 0 && (
            <div>
              <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">Completada por</p>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {rewards.map((r) => (
                  <div key={r.user_id} className="font-body text-xs text-ink-light">
                    {r.user ? userLabel(r.user) : "—"} — +{r.awarded_xp} XP, +{r.awarded_rp} RP
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function QuestsManager() {
  const [quests, setQuests] = React.useState<QuestRow[]>([]);
  const [badges, setBadges] = React.useState<ShgBadge[]>([]);
  const [users, setUsers] = React.useState<ShgUserPublic[]>([]);
  const [events, setEvents] = React.useState<EventOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<QuestRow | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<QuestType | "all">("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    const [questsRes, badgesRes, usersRes, eventsRes] = await Promise.all([
      fetch("/api/admin/quests"), fetch("/api/admin/badges"), fetch("/api/admin/users"), fetch("/api/admin/events"),
    ]);
    setQuests((await questsRes.json()).data ?? []);
    setBadges((await badgesRes.json()).data ?? []);
    setUsers((await usersRes.json()).data ?? []);
    setEvents((await eventsRes.json()).data ?? []);
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
      title: q.title, narrative: q.narrative ?? "", type: q.type, status: q.status,
      reward_xp: q.reward_xp, reward_rp: q.reward_rp, badge_id: q.badge_id ?? "",
      goal_count: q.goal_count ? String(q.goal_count) : "",
      starts_at: q.starts_at ? q.starts_at.slice(0, 16) : "",
      ends_at: q.ends_at ? q.ends_at.slice(0, 16) : "",
      event_id: q.event_id ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        badge_id: form.badge_id || null,
        goal_count: form.goal_count ? Number(form.goal_count) : null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        event_id: form.event_id || null,
      };
      const res = await fetch(editing ? `/api/admin/quests/${editing.id}` : "/api/admin/quests", {
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
    const res = await fetch(`/api/admin/quests/${q.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Misión eliminada."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  const filtered = typeFilter === "all" ? quests : quests.filter((q) => q.type === typeFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Misiones</h1>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nueva misión</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["all", "individual", "party", "community", "event"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={cn(
              "font-label text-2xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-sm border transition-colors",
              typeFilter === t ? "bg-brass text-ink border-brass" : "border-parchment-dark/40 text-parchment-dark hover:border-brass"
            )}
          >
            {t === "all" ? "Todas" : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="font-body italic text-parchment-dark">No hay misiones en esta categoría.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((q) => (
            <div key={q.id} className="surface-parchment p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="relative size-9 shrink-0 rounded-full bg-brass/15 flex items-center justify-center text-base overflow-hidden">
                    {q.badge?.icon_url ? (
                      <Image src={q.badge.icon_url} alt="" fill className="object-cover" sizes="36px" />
                    ) : (
                      q.badge?.icon || <ScrollText size={16} className="text-brass" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <p className="font-label text-sm font-bold text-ink">{q.title}</p>
                      <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                        {TYPE_LABELS[q.type]}
                      </span>
                      <span className={cn(
                        "font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm",
                        q.status === "active" ? "bg-moss/15 text-moss-dark" : q.status === "archived" ? "bg-crimson/15 text-crimson" : "bg-brass/15 text-brass"
                      )}>
                        {STATUS_LABELS[q.status]}
                      </span>
                    </div>
                    {q.narrative && <p className="font-body text-xs text-ink-light line-clamp-2">{q.narrative}</p>}
                    <p className="font-body text-2xs text-ink-light mt-0.5">
                      +{q.reward_xp} XP · +{q.reward_rp} RP{q.badge ? ` · insignia "${q.badge.name}"` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} className="p-1.5 text-leather-light hover:text-brass transition-colors">
                    {expandedId === q.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <button onClick={() => openEdit(q)} className="p-1.5 text-leather-light hover:text-brass transition-colors"><Edit2 size={15} /></button>
                  <button onClick={() => handleDelete(q)} className="p-1.5 text-leather-light hover:text-crimson transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>
              {expandedId === q.id && <QuestDetail quest={q} users={users} />}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar misión" : "Nueva misión"} className="max-w-xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label="Título" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Narrativa (opcional)" rows={2} value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })} />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as QuestType })}>
              {(["individual", "party", "community", "event"] as const).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </Select>
            <Select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as QuestStatus })}>
              {(["draft", "active", "archived"] as const).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Recompensa XP" type="number" min={0} value={form.reward_xp} onChange={(e) => setForm({ ...form, reward_xp: Number(e.target.value) })} />
            <Input label="Recompensa RP" type="number" min={0} value={form.reward_rp} onChange={(e) => setForm({ ...form, reward_rp: Number(e.target.value) })} />
          </div>

          <Select label="Insignia (opcional)" value={form.badge_id} onChange={(e) => setForm({ ...form, badge_id: e.target.value })}>
            <option value="">Ninguna</option>
            {badges.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>

          {form.type === "community" && (
            <Input
              label="Meta de contribuciones"
              type="number"
              min={1}
              required
              value={form.goal_count}
              onChange={(e) => setForm({ ...form, goal_count: e.target.value })}
            />
          )}

          {form.type === "event" && (
            <Select label="Evento vinculado (opcional)" value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })}>
              <option value="">Ninguno</option>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Inicio (opcional)" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            <Input label="Fin (opcional)" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          </div>

          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
