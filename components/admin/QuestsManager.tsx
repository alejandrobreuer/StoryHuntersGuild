"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, ScrollText, Dice5 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS } from "@/lib/gamification/questDifficulty";
import type { ShgQuest, ShgBadge, ShgGame, ShgUserPublic, QuestType, QuestStatus, QuestDifficulty, QuestEventStatus, QuestGroupStatus } from "@/types/database";

interface EventLink { id: string; title: string; status: QuestEventStatus; closed_at: string | null }
interface QuestRow extends ShgQuest {
  badge: { id: string; name: string; icon: string | null; icon_url: string | null } | null;
  game: { id: string; name: string; image_url: string | null } | null;
  events: EventLink[];
}
interface CompletionRow {
  id: string; user_id: string; contribution_amount: number; event_id: string | null; created_at: string;
  user: { id: string; email: string; name: string | null } | null;
  event: { id: string; title: string } | null;
}
interface RewardRow {
  id: string; user_id: string; awarded_xp: number; awarded_rp: number; awarded_at: string;
  user: { id: string; email: string; name: string | null } | null;
}
interface ActivationRow {
  id: string; event_id: string | null; user_id: string; status: "active" | "turned_in" | "rejected" | "confirmed"; turned_in_at: string | null;
  user: { id: string; email: string; name: string | null } | null;
}
interface GroupMemberRow {
  user_id: string;
  user: { id: string; email: string; name: string | null } | null;
}
interface GroupRow {
  id: string; event_id: string; status: QuestGroupStatus;
  started_at: string | null; turned_in_at: string | null; closed_at: string | null;
  members: GroupMemberRow[];
}

const TYPE_LABELS: Record<QuestType, string> = {
  individual: "Individual", group: "Grupo", event: "Evento", guild: "Misión de Gremio",
};
const STATUS_LABELS: Record<QuestStatus, string> = { draft: "Borrador", active: "Activa", archived: "Archivada" };
const DIFFICULTY_STYLES: Record<QuestDifficulty, string> = {
  low: "bg-moss/15 text-moss-dark",
  medium: "bg-brass/15 text-brass",
  high: "bg-crimson/15 text-crimson",
};
const EVENT_STATUS_LABELS: Record<QuestEventStatus, string> = { open: "En curso", achieved: "Lograda", failed: "No lograda" };
const EVENT_STATUS_STYLES: Record<QuestEventStatus, string> = {
  open: "bg-brass/15 text-brass", achieved: "bg-moss/15 text-moss-dark", failed: "bg-crimson/15 text-crimson",
};
const GROUP_STATUS_LABELS: Record<QuestGroupStatus, string> = {
  forming: "Formándose", started: "En curso", turned_in: "Esperando confirmación", completed: "Completado", rejected: "Rechazado",
};

const EMPTY = {
  title: "", narrative: "", type: "individual" as QuestType, status: "draft" as QuestStatus,
  difficulty: "medium" as QuestDifficulty, reward_xp: 10, reward_rp: 0, badge_id: "", game_id: "",
  max_completions_per_event: "0", max_participants: "", required_turn_ins: "", goal_count: "", starts_at: "", ends_at: "",
};

function userLabel(u: { email: string; name: string | null } | null): string {
  if (!u) return "—";
  return u.name ? `${u.name} (${u.email})` : u.email;
}

function QuestDetail({ quest, users }: { quest: QuestRow; users: ShgUserPublic[] }) {
  const [completions, setCompletions] = React.useState<CompletionRow[] | null>(null);
  const [rewards, setRewards] = React.useState<RewardRow[] | null>(null);
  const [activations, setActivations] = React.useState<ActivationRow[] | null>(null);
  const [groups, setGroups] = React.useState<GroupRow[] | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch(`/api/admin/quests/${quest.id}/completions`);
    const json = await res.json();
    setCompletions(json.data?.completions ?? []);
    setRewards(json.data?.rewards ?? []);
    setActivations(json.data?.activations ?? []);
    setGroups(json.data?.groups ?? []);
  }, [quest.id]);

  React.useEffect(() => { load(); }, [load]);

  const usedForEvent = React.useMemo(
    () => (completions ?? []).filter((c) => c.event_id === selectedEventId).length,
    [completions, selectedEventId]
  );
  const capReached = selectedEventId !== "" && quest.max_completions_per_event > 0 && usedForEvent >= quest.max_completions_per_event;

  const confirmedCountForEvent = React.useMemo(
    () => (activations ?? []).filter((a) => a.status === "confirmed" && a.event_id === selectedEventId).length,
    [activations, selectedEventId]
  );

  async function confirm(userId: string, eventId: string | null) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quests/${quest.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, eventId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error."); return; }
      toast.success("Misión confirmada y recompensa otorgada.");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function markComplete() {
    if (!selectedUserId) { toast.error("Elegí un usuario."); return; }
    await confirm(selectedUserId, quest.type === "guild" ? null : (selectedEventId || null));
    setSelectedUserId("");
  }

  if (!completions || !rewards || !activations || !groups) {
    return <p className="font-body text-xs italic text-ink-light">Cargando…</p>;
  }

  const eventLink = quest.events.find((e) => e.id === selectedEventId) ?? null;
  const groupsForEvent = groups.filter((g) => g.event_id === selectedEventId);

  return (
    <div className="flex flex-col gap-4 pt-3 border-t border-border">
      <a href="/admin/turn-ins" className="self-start font-label text-2xs uppercase tracking-wide text-brass underline">
        Ver entregas pendientes en Aprobaciones de entregas →
      </a>

      {quest.type !== "guild" && quest.events.length > 0 && (
        <div>
          <Select
            label="Evento"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="">Elegí un evento…</option>
            {quest.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </Select>
          {selectedEventId && quest.type !== "event" && (
            <p className={cn("font-body text-2xs mt-1", capReached ? "text-crimson" : "text-ink-light")}>
              {quest.max_completions_per_event > 0
                ? `${usedForEvent} / ${quest.max_completions_per_event} usos en este evento${capReached ? " — límite alcanzado" : ""}`
                : `${usedForEvent} uso(s) registrados en este evento · sin límite`}
            </p>
          )}
          {selectedEventId && quest.type === "event" && eventLink && (
            <div className="mt-1.5">
              <div className="flex items-center justify-between font-label text-2xs uppercase tracking-widest text-leather-light mb-1">
                <span>Entregas aprobadas</span>
                <span>{confirmedCountForEvent} / {quest.required_turn_ins ?? "—"}</span>
              </div>
              <div className="h-2 w-full bg-parchment-dark/40 overflow-hidden rounded-full mb-1.5">
                <div
                  className="h-full bg-brass transition-all"
                  style={{ width: `${quest.required_turn_ins ? Math.min(100, (confirmedCountForEvent / quest.required_turn_ins) * 100) : 0}%` }}
                />
              </div>
              <span className={cn("font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm", EVENT_STATUS_STYLES[eventLink.status])}>
                {EVENT_STATUS_LABELS[eventLink.status]}
              </span>
            </div>
          )}
        </div>
      )}

      {quest.type === "guild" && (
        <div>
          <div className="flex items-center justify-between font-label text-2xs uppercase tracking-widest text-leather-light mb-1">
            <span>Progreso</span>
            <span>{completions.length} / {quest.goal_count ?? "—"}</span>
          </div>
          <div className="h-2 w-full bg-parchment-dark/40 overflow-hidden rounded-full">
            <div
              className="h-full bg-moss transition-all"
              style={{ width: `${quest.goal_count ? Math.min(100, (completions.length / quest.goal_count) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {quest.type === "group" ? (
        <>
          {selectedEventId && groupsForEvent.length > 0 && (
            <div>
              <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">Grupos para este evento</p>
              <div className="flex flex-col gap-2">
                {groupsForEvent.map((g) => (
                  <div key={g.id} className="border border-border rounded-sm px-2.5 py-2 bg-parchment-card/40">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-body text-xs text-ink-light">
                        {g.members.map((m) => userLabel(m.user)).join(", ") || "Sin integrantes"}
                      </span>
                      <span className={cn(
                        "font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm shrink-0",
                        g.status === "turned_in" ? "bg-crimson/15 text-crimson" : g.status === "completed" ? "bg-moss/15 text-moss-dark" : g.status === "rejected" ? "bg-ink/10 text-ink-light" : "bg-brass/15 text-brass"
                      )}>
                        {GROUP_STATUS_LABELS[g.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedEventId && groupsForEvent.length === 0 && (
            <p className="font-body text-xs italic text-ink-light">Todavía no se formó ningún grupo para este evento.</p>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <Select wrapperClassName="flex-1 min-w-[180px]" label="Completar para" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">Elegí un usuario…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
            </Select>
            <Button size="sm" onClick={markComplete} loading={busy} disabled={capReached}>Marcar completada</Button>
          </div>

          {rewards.length > 0 && (
            <div>
              <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">Completada por</p>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {rewards.map((r) => (
                  <div key={r.id} className="font-body text-xs text-ink-light">
                    {userLabel(r.user)} — +{r.awarded_xp} XP, +{r.awarded_rp} RP
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
  const [games, setGames] = React.useState<ShgGame[]>([]);
  const [users, setUsers] = React.useState<ShgUserPublic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<QuestRow | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<QuestType | "all">("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    const [questsRes, badgesRes, usersRes, gamesRes] = await Promise.all([
      fetch("/api/admin/quests"), fetch("/api/admin/badges"), fetch("/api/admin/users"), fetch("/api/admin/games"),
    ]);
    setQuests((await questsRes.json()).data ?? []);
    setBadges((await badgesRes.json()).data ?? []);
    setUsers((await usersRes.json()).data ?? []);
    setGames((await gamesRes.json()).data ?? []);
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
      difficulty: q.difficulty, reward_xp: q.reward_xp, reward_rp: q.reward_rp,
      badge_id: q.badge_id ?? "", game_id: q.game_id ?? "",
      max_completions_per_event: String(q.max_completions_per_event),
      max_participants: q.max_participants ? String(q.max_participants) : "",
      required_turn_ins: q.required_turn_ins ? String(q.required_turn_ins) : "",
      goal_count: q.goal_count ? String(q.goal_count) : "",
      starts_at: q.starts_at ? q.starts_at.slice(0, 16) : "",
      ends_at: q.ends_at ? q.ends_at.slice(0, 16) : "",
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
        game_id: form.game_id || null,
        max_completions_per_event: Number(form.max_completions_per_event) || 0,
        max_participants: form.max_participants ? Number(form.max_participants) : null,
        required_turn_ins: form.required_turn_ins ? Number(form.required_turn_ins) : null,
        goal_count: form.goal_count ? Number(form.goal_count) : null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
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
  const selectedGame = games.find((g) => g.id === form.game_id) ?? null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Misiones</h1>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nueva misión</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["all", "individual", "group", "event", "guild"] as const).map((t) => (
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
                      <span className={cn("font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm", DIFFICULTY_STYLES[q.difficulty])}>
                        {DIFFICULTY_LABELS[q.difficulty]}
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
                      {q.type === "group" && q.max_participants ? ` · hasta ${q.max_participants} integrantes` : ""}
                      {q.type === "event" && q.required_turn_ins ? ` · ${q.required_turn_ins} entregas para lograrla` : ""}
                      {q.max_completions_per_event > 0 ? ` · máx. ${q.max_completions_per_event}/evento` : ""}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {q.game && (
                        <span className="inline-flex items-center gap-1.5 font-label text-2xs px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                          <span className="relative size-4 shrink-0 rounded-sm overflow-hidden bg-parchment-dark/40">
                            {q.game.image_url ? (
                              <Image src={q.game.image_url} alt="" fill className="object-cover" sizes="16px" />
                            ) : (
                              <Dice5 size={10} className="absolute inset-0 m-auto text-leather-light" />
                            )}
                          </span>
                          {q.game.name}
                        </span>
                      )}
                      {q.events.length > 0 && (
                        <span className="font-label text-2xs px-1.5 py-0.5 rounded-sm bg-brass/10 text-brass">
                          Disponible en {q.events.length} evento{q.events.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
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

          <div className="grid grid-cols-3 gap-3">
            <Select label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as QuestType })}>
              {(["individual", "group", "event", "guild"] as const).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </Select>
            <Select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as QuestStatus })}>
              {(["draft", "active", "archived"] as const).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </Select>
            {form.type !== "guild" && (
              <Select label="Dificultad" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as QuestDifficulty })}>
                {(["low", "medium", "high"] as const).map((d) => (
                  <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
                ))}
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Recompensa XP" type="number" min={0} value={form.reward_xp} onChange={(e) => setForm({ ...form, reward_xp: Number(e.target.value) })} />
            <Input label="Recompensa RP" type="number" min={0} value={form.reward_rp} onChange={(e) => setForm({ ...form, reward_rp: Number(e.target.value) })} />
          </div>

          <Select label="Insignia (opcional)" value={form.badge_id} onChange={(e) => setForm({ ...form, badge_id: e.target.value })}>
            <option value="">Ninguna</option>
            {badges.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>

          {form.type !== "guild" && (
            <div className="flex flex-col gap-1.5">
              <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Juego relacionado (opcional)</label>
              <div className="flex items-center gap-3">
                <div className="relative size-11 shrink-0 rounded-sm bg-parchment-dark/40 border border-brass/30 flex items-center justify-center overflow-hidden">
                  {selectedGame?.image_url ? (
                    <Image src={selectedGame.image_url} alt="" fill className="object-cover" sizes="44px" />
                  ) : (
                    <Dice5 size={16} className="text-leather-light" />
                  )}
                </div>
                <Select wrapperClassName="flex-1" value={form.game_id} onChange={(e) => setForm({ ...form, game_id: e.target.value })}>
                  <option value="">Ninguno</option>
                  {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </div>
            </div>
          )}

          {form.type === "group" && (
            <Input
              label="Tamaño máximo del grupo"
              type="number"
              min={2}
              required
              value={form.max_participants}
              onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
              helperText="Cualquier integrante puede iniciar la misión una vez haya al menos 2 en el grupo."
            />
          )}

          {form.type === "event" && (
            <Input
              label="Entregas necesarias para lograrla"
              type="number"
              min={1}
              required
              value={form.required_turn_ins}
              onChange={(e) => setForm({ ...form, required_turn_ins: e.target.value })}
              helperText="Al alcanzar esta cantidad de entregas, la misión se logra y recompensa a todos automáticamente."
            />
          )}

          {form.type === "guild" && (
            <Input
              label="Meta de contribuciones"
              type="number"
              min={1}
              required
              value={form.goal_count}
              onChange={(e) => setForm({ ...form, goal_count: e.target.value })}
            />
          )}

          {form.type !== "guild" && (
            <Input
              label="Límite de veces por evento"
              type="number"
              min={0}
              value={form.max_completions_per_event}
              onChange={(e) => setForm({ ...form, max_completions_per_event: e.target.value })}
              helperText="0 = ilimitado. Se aplica cuando esta misión está asignada a un evento (desde el editor del evento)."
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={form.type === "guild" ? "Inicio" : "Inicio (opcional)"}
              type="datetime-local" required={form.type === "guild"}
              value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
            <Input
              label={form.type === "guild" ? "Fin" : "Fin (opcional)"}
              type="datetime-local" required={form.type === "guild"}
              value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            />
          </div>
          {form.type === "guild" && (
            <p className="font-body text-2xs text-leather-light -mt-2">
              La misión de gremio solo aparece en la página de inicio dentro de esta ventana de fechas.
            </p>
          )}

          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
