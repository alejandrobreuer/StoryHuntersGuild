"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RolQuestStatus, RolQuestApplicationStatus, ShgRolQuestNote } from "@/types/database";

interface QuestDetail {
  quest: {
    id: string; title: string; description: string; status: RolQuestStatus;
    reward_coin: number; reward_standing: number; reward_supplies: number;
    max_participants: number; scheduled_date: string | null; session_count: number;
    leader_character_id: string | null; supplies_pool_remaining: number;
  };
  participants: { id: string; name: string }[];
  myCharacterId: string | null;
  myApplication: { id: string; status: RolQuestApplicationStatus; character_id: string } | null;
  leaderVotes: { voter_character_id: string; candidate_character_id: string }[];
  isLeader: boolean;
  eligibleFeatures: { id: string; title: string; cost_supplies: number; supplies_allocated: number }[];
  publicNotes: ShgRolQuestNote[];
  myThread: ShgRolQuestNote[];
}

interface CharacterOption { id: string; name: string }

const STATUS_LABELS: Record<RolQuestStatus, string> = {
  available: "Disponible", active: "Activa", turned_in: "Entregada", accepted: "Aceptada", completed: "Completada",
};
const APPLICATION_LABELS: Record<RolQuestApplicationStatus, string> = {
  pending: "Tu postulación está pendiente de revisión.",
  approved: "¡Fuiste aceptado en esta misión!",
  rejected: "Tu postulación no fue seleccionada esta vez.",
};

function ApplySection({ questId, onChanged }: { questId: string; onChanged: () => void }) {
  const [characters, setCharacters] = React.useState<CharacterOption[] | null>(null);
  const [characterId, setCharacterId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/rol/characters")
      .then((r) => r.json())
      .then((json) => setCharacters(json.data ?? []));
  }, []);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!characterId) { toast.error("Elegí un personaje."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/rol/quests/${questId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character_id: characterId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al postularte."); return; }
      toast.success("¡Te postulaste!");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (characters === null) return <p className="font-body italic text-ink-light text-sm">Cargando…</p>;
  if (characters.length === 0) {
    return <p className="font-body italic text-ink-light text-sm">Necesitás un personaje para postularte.</p>;
  }

  return (
    <form onSubmit={handleApply} className="flex flex-col sm:flex-row gap-2 sm:items-end">
      <Select label="Postularme con" wrapperClassName="flex-1" value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
        <option value="">Elegí un personaje…</option>
        {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Button type="submit" loading={busy}>Postularme</Button>
    </form>
  );
}

function LeaderVoteSection({
  questId, participants, myCharacterId, votes, onChanged,
}: {
  questId: string;
  participants: { id: string; name: string }[];
  myCharacterId: string;
  votes: { voter_character_id: string; candidate_character_id: string }[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const myVote = votes.find((v) => v.voter_character_id === myCharacterId)?.candidate_character_id ?? null;
  const tally = new Map<string, number>();
  for (const v of votes) tally.set(v.candidate_character_id, (tally.get(v.candidate_character_id) ?? 0) + 1);

  async function vote(candidateId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/rol/quests/${questId}/leader-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_character_id: candidateId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al votar."); return; }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="font-body text-xs text-ink-light mb-2">
        {votes.length}/{participants.length} personajes votaron. Elegí quién lidera la misión:
      </p>
      <div className="flex flex-col gap-1.5">
        {participants.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy}
            onClick={() => vote(p.id)}
            className={cn(
              "flex items-center justify-between gap-2 border px-3 py-1.5 text-left transition-colors disabled:opacity-50",
              myVote === p.id ? "border-brass bg-brass/10" : "border-border hover:border-brass"
            )}
          >
            <span className="font-body text-sm text-ink-light">{p.name}</span>
            <span className="font-label text-2xs text-leather-light">{tally.get(p.id) ?? 0} voto(s)</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AllocateSection({
  questId, remaining, features, onChanged,
}: {
  questId: string;
  remaining: number;
  features: { id: string; title: string; cost_supplies: number; supplies_allocated: number }[];
  onChanged: () => void;
}) {
  const [amounts, setAmounts] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  async function allocate(featureId: string) {
    const amount = Number(amounts[featureId]) || 0;
    if (amount <= 0) { toast.error("Ingresá una cantidad."); return; }
    if (amount > remaining) { toast.error("No tenés tantos suministros disponibles."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/rol/quests/${questId}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature_id: featureId, amount }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al asignar."); return; }
      toast.success("Suministros asignados.");
      setAmounts((a) => ({ ...a, [featureId]: "" }));
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="font-body text-sm text-ink-light mb-3">
        Tenés <strong>{remaining}</strong> suministros para asignar a funciones del gremio.
      </p>
      {features.length === 0 ? (
        <p className="font-body italic text-ink-light text-sm">No hay funciones elegibles para el estado actual del gremio.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {features.map((f) => (
            <div key={f.id} className="flex items-center gap-2 border border-border px-3 py-2 flex-wrap">
              <span className="font-body text-sm text-ink-light flex-1 min-w-[8rem]">
                {f.title} <span className="text-leather-light">({f.supplies_allocated}/{f.cost_supplies})</span>
              </span>
              <Input
                type="number"
                min={1}
                max={remaining}
                wrapperClassName="w-24"
                value={amounts[f.id] ?? ""}
                onChange={(e) => setAmounts((a) => ({ ...a, [f.id]: e.target.value }))}
              />
              <Button size="sm" disabled={busy || remaining <= 0} onClick={() => allocate(f.id)}>Asignar</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RolQuestDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = React.useState<QuestDetail | null | undefined>(undefined);
  const [note, setNote] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [withdrawing, setWithdrawing] = React.useState(false);
  const [turningIn, setTurningIn] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch(`/api/rol/quests/${params.id}`);
    const json = await res.json();
    setDetail(res.ok ? json.data : null);
  }, [params.id]);

  React.useEffect(() => { load(); }, [load]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/rol/quests/${params.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar la nota."); return; }
      setNote("");
      load();
    } finally {
      setPosting(false);
    }
  }

  async function handleTurnIn() {
    if (!confirm("¿Entregar esta misión al DM?")) return;
    setTurningIn(true);
    try {
      const res = await fetch(`/api/rol/quests/${params.id}/turn-in`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al entregar la misión."); return; }
      toast.success("Misión entregada.");
      load();
    } finally {
      setTurningIn(false);
    }
  }

  async function handleWithdraw() {
    if (!confirm("¿Retirar tu postulación?")) return;
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/rol/quests/${params.id}/apply`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al retirar la postulación."); return; }
      toast.success("Postulación retirada.");
      load();
    } finally {
      setWithdrawing(false);
    }
  }

  if (detail === undefined) return null;
  if (detail === null) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="font-body italic text-parchment-dark">No tenés acceso a esta misión.</p>
      </main>
    );
  }

  const { quest, participants, myCharacterId, myApplication, leaderVotes, isLeader, eligibleFeatures, publicNotes, myThread } = detail;
  const leader = quest.leader_character_id ? participants.find((p) => p.id === quest.leader_character_id) : null;

  return (
    <main className="max-w-2xl mx-auto px-6 py-14">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/15 text-brass">
          {STATUS_LABELS[quest.status]}
        </span>
      </div>
      <h1 className="font-display text-3xl text-parchment mb-3">{quest.title}</h1>
      <p className="font-body text-sm text-parchment-dark mb-3">{quest.description}</p>
      <p className="font-body text-xs text-parchment-dark mb-6">
        Hasta {quest.max_participants} participantes
        {quest.scheduled_date && <> · {new Date(quest.scheduled_date + "T00:00:00").toLocaleDateString("es-AR")}</>}
        {" "}· {quest.session_count} {quest.session_count === 1 ? "sesión" : "sesiones"}
      </p>

      {participants.length > 0 && (
        <p className="font-body text-xs text-parchment-dark mb-8">
          Participantes: {participants.map((p) => p.name).join(", ")}
        </p>
      )}

      {quest.status === "available" && (
        <section className="surface-parchment p-5 mb-6">
          <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">Postulación</h2>
          {myApplication ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="font-body text-sm text-ink-light">{APPLICATION_LABELS[myApplication.status]}</p>
              <Button size="sm" variant="ghost" onClick={handleWithdraw} loading={withdrawing}>Retirar postulación</Button>
            </div>
          ) : (
            <ApplySection questId={quest.id} onChanged={load} />
          )}
        </section>
      )}

      {quest.status === "active" && (
        <section className="surface-parchment p-5 mb-6">
          <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">Líder de la misión</h2>
          {leader ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="font-body text-sm text-ink-light">{leader.name} lidera esta misión.</p>
              {isLeader && (
                <Button size="sm" onClick={handleTurnIn} loading={turningIn}>Entregar misión</Button>
              )}
            </div>
          ) : myCharacterId ? (
            <LeaderVoteSection questId={quest.id} participants={participants} myCharacterId={myCharacterId} votes={leaderVotes} onChanged={load} />
          ) : (
            <p className="font-body italic text-ink-light text-sm">Todavía no hay un líder asignado.</p>
          )}
        </section>
      )}

      {quest.status === "turned_in" && (
        <section className="surface-parchment p-5 mb-6">
          <p className="font-body text-sm text-ink-light">
            {leader?.name ?? "El líder"} entregó esta misión — esperando que el DM la acepte.
          </p>
        </section>
      )}

      {quest.status === "accepted" && (
        <section className="surface-parchment p-5 mb-6">
          <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">Recompensas</h2>
          <p className="font-body text-sm text-ink-light mb-3">
            {quest.reward_standing} pts. de gremio otorgados a cada participante.
          </p>
          {isLeader ? (
            <AllocateSection questId={quest.id} remaining={quest.supplies_pool_remaining} features={eligibleFeatures} onChanged={load} />
          ) : (
            <p className="font-body italic text-ink-light text-sm">
              {leader?.name ?? "El líder"} está asignando los {quest.supplies_pool_remaining} suministros restantes a funciones del gremio.
            </p>
          )}
        </section>
      )}

      <section className="surface-parchment p-5 mb-6">
        <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">Notas públicas</h2>
        {publicNotes.length === 0 ? (
          <p className="font-body italic text-ink-light text-sm">Sin notas todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {publicNotes.map((n) => <p key={n.id} className="font-body text-sm text-ink-light border-l-2 border-brass/40 pl-3">{n.content}</p>)}
          </div>
        )}
      </section>

      {myCharacterId && (
        <section className={cn("surface-parchment p-5")}>
          <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">Tus notas privadas</h2>
          <div className="flex flex-col gap-2 mb-4">
            {myThread.length === 0 ? (
              <p className="font-body italic text-ink-light text-sm">Solo vos y el DM ven esto.</p>
            ) : (
              myThread.map((n) => (
                <p key={n.id} className="font-body text-sm text-ink-light border-l-2 border-moss/40 pl-3">
                  {n.author_kind === "admin" ? "DM: " : ""}{n.content}
                </p>
              ))
            )}
          </div>
          <form onSubmit={handlePost} className="flex gap-2">
            <Input wrapperClassName="flex-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Escribí una nota…" />
            <Button type="submit" loading={posting}>Enviar</Button>
          </form>
        </section>
      )}
    </main>
  );
}
