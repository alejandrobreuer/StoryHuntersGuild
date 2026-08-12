"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/formatting";
import { toast } from "sonner";
import type { QuestType } from "@/types/database";

interface UserInfo { id: string; email: string; name: string | null; }
interface EventInfo { id: string; title: string; }

interface ActivationRow {
  id: string; quest_id: string; event_id: string | null; user_id: string; turned_in_at: string;
  quest: { id: string; title: string; type: QuestType; reward_xp: number; reward_rp: number } | { id: string; title: string; type: QuestType; reward_xp: number; reward_rp: number }[] | null;
  user: UserInfo | UserInfo[] | null;
  event: EventInfo | EventInfo[] | null;
}
interface GroupRow {
  id: string; quest_id: string; event_id: string; turned_in_at: string;
  quest: { id: string; title: string; reward_xp: number; reward_rp: number } | { id: string; title: string; reward_xp: number; reward_rp: number }[] | null;
  event: EventInfo | EventInfo[] | null;
  members: { user_id: string; user: UserInfo | UserInfo[] | null }[];
}

type QueueItem =
  | { kind: "activation"; sortKey: string; row: ActivationRow }
  | { kind: "group"; sortKey: string; row: GroupRow };

const TYPE_LABELS: Record<QuestType, string> = {
  individual: "Individual", group: "Grupo", event: "Evento", guild: "Misión de Gremio",
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
function userLabel(u: UserInfo | null): string {
  if (!u) return "—";
  return u.name ? `${u.name} (${u.email})` : u.email;
}

export function TurnInApprovals() {
  const [activations, setActivations] = React.useState<ActivationRow[] | null>(null);
  const [groups, setGroups] = React.useState<GroupRow[] | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/admin/turn-ins");
    const json = await res.json();
    setActivations(json.data?.activations ?? []);
    setGroups(json.data?.groups ?? []);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function act(key: string, url: string, body: object | undefined, successMsg: string) {
    setBusyId(key);
    try {
      const res = await fetch(url, {
        method: "POST",
        ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Ocurrió un error."); return; }
      toast.success(successMsg);
      load();
    } finally {
      setBusyId(null);
    }
  }

  if (!activations || !groups) {
    return <p className="font-body italic text-parchment-dark">Cargando…</p>;
  }

  const queue: QueueItem[] = [
    ...activations.map((row): QueueItem => ({ kind: "activation", sortKey: row.turned_in_at, row })),
    ...groups.map((row): QueueItem => ({ kind: "group", sortKey: row.turned_in_at, row })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return (
    <div>
      <h1 className="font-display text-2xl text-parchment mb-2">Aprobaciones de entregas</h1>
      <p className="font-body text-sm text-parchment-dark mb-6">
        Todas las misiones entregadas por los jugadores, esperando confirmación — ordenadas por la más antigua primero.
      </p>

      {queue.length === 0 ? (
        <p className="font-body italic text-parchment-dark">No hay entregas pendientes por el momento.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {queue.map((item) => {
            if (item.kind === "activation") {
              const a = item.row;
              const quest = one(a.quest);
              const user = one(a.user);
              const event = one(a.event);
              if (!quest) return null;
              const key = a.id;
              return (
                <div key={key} className="surface-parchment p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-label text-sm font-bold text-ink">{quest.title}</p>
                      <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                        {TYPE_LABELS[quest.type]}
                      </span>
                    </div>
                    <p className="font-body text-xs text-ink-light">
                      {userLabel(user)}{event ? ` · ${event.title}` : ""} · {formatDateTime(a.turned_in_at)}
                    </p>
                    <p className="font-body text-2xs text-brass mt-0.5">+{quest.reward_xp} XP · +{quest.reward_rp} RP</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm" variant="secondary" loading={busyId === key}
                      onClick={() => act(key, `/api/admin/quests/${a.quest_id}/complete`, { userId: a.user_id, eventId: a.event_id }, "Entrega confirmada.")}
                    >
                      <Check size={13} className="mr-1" />Confirmar
                    </Button>
                    <Button
                      size="sm" variant="ghost" loading={busyId === key}
                      onClick={() => act(key, `/api/admin/quests/${a.quest_id}/reject`, { userId: a.user_id, eventId: a.event_id }, "Entrega rechazada.")}
                    >
                      <X size={13} className="mr-1" />Rechazar
                    </Button>
                  </div>
                </div>
              );
            }

            const g = item.row;
            const quest = one(g.quest);
            const event = one(g.event);
            if (!quest) return null;
            const key = g.id;
            const labels = g.members.map((m) => userLabel(one(m.user)));
            return (
              <div key={key} className="surface-parchment p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-label text-sm font-bold text-ink">{quest.title}</p>
                    <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">Grupo</span>
                  </div>
                  <p className="font-body text-xs text-ink-light">
                    {labels.join(", ")}{event ? ` · ${event.title}` : ""} · {formatDateTime(g.turned_in_at)}
                  </p>
                  <p className="font-body text-2xs text-brass mt-0.5">+{quest.reward_xp} XP · +{quest.reward_rp} RP cada uno</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm" variant="secondary" loading={busyId === key}
                    onClick={() => act(key, `/api/admin/quests/${g.quest_id}/groups/${g.id}/complete`, undefined, "Grupo confirmado.")}
                  >
                    <Check size={13} className="mr-1" />Confirmar
                  </Button>
                  <Button
                    size="sm" variant="ghost" loading={busyId === key}
                    onClick={() => act(key, `/api/admin/quests/${g.quest_id}/groups/${g.id}/reject`, undefined, "Grupo rechazado.")}
                  >
                    <X size={13} className="mr-1" />Rechazar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
