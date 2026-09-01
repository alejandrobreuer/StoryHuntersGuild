"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Contact, Coins, Trophy, Boxes } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { NoteEditor } from "@/components/rol/quest/NoteEditor";
import { CharacterSheet } from "@/components/rol/character/CharacterSheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RolQuestStatus, RolQuestApplicationStatus } from "@/types/database";
import type { FUCharacter } from "@/app/FU/lib/types";

interface ParticipantRef { id: string; name: string; portrait_url: string | null }

interface QuestDetail {
  quest: {
    id: string; title: string; description: string; status: RolQuestStatus;
    reward_coin: number; reward_standing: number; reward_supplies: number;
    max_participants: number; scheduled_date: string | null; session_count: number;
    leader_character_id: string | null; supplies_pool_remaining: number;
  };
  participants: ParticipantRef[];
  myCharacterId: string | null;
  isRolAdmin: boolean;
  myApplication: { id: string; status: RolQuestApplicationStatus; character_id: string } | null;
  leaderVotes: { voter_character_id: string; candidate_character_id: string }[];
  isLeader: boolean;
  eligibleFeatures: { id: string; title: string; cost_supplies: number; supplies_allocated: number }[];
  publicNote: { content: string; updated_at: string } | null;
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

function ParticipantPortrait({ p, big }: { p: ParticipantRef; big?: boolean }) {
  const boxClass = big ? "size-16 border-2" : "size-10 border";
  return p.portrait_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
    <img src={p.portrait_url} alt="" className={cn(boxClass, "rounded-full object-cover border-brass/40")} />
  ) : (
    <div className={cn(boxClass, "rounded-full border-brass/40 bg-brass/15 flex items-center justify-center")}>
      <Contact size={big ? 26 : 16} className="text-brass" />
    </div>
  );
}

// Full-width bar right below the top nav — title, status, and every
// participant's portrait, laid out side by side.
function MissionTopBar({ quest, participants }: { quest: QuestDetail["quest"]; participants: ParticipantRef[] }) {
  return (
    <div className="w-full bg-[#1c1810] border-b border-brass/25 px-4 py-3 md:px-8">
      <div className="flex items-center gap-6 overflow-x-auto">
        <div className="shrink-0 max-w-md">
          <div className="flex items-center gap-2">
            <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/15 text-brass shrink-0">
              {STATUS_LABELS[quest.status]}
            </span>
            <h1 className="font-display text-lg text-parchment truncate">{quest.title}</h1>
          </div>
        </div>
        {participants.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            {participants.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <ParticipantPortrait p={p} />
                <span className="font-label text-2xs text-parchment-dark max-w-14 truncate">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RewardStat({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-sm border border-border px-3 py-2">
      <Icon size={18} className="shrink-0 text-brass" />
      <div className="min-w-0">
        <p className="font-label text-2xs uppercase tracking-wide text-ink-light">{label}</p>
        <p className="font-display text-base text-ink truncate">{value}</p>
      </div>
    </div>
  );
}

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
  participants: ParticipantRef[];
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

// ─── DM view ────────────────────────────────────────────────────────────────
// Different from the player view above: no single "your own character"
// front and center — a mission overview on the left (editable notes, since
// the DM is the one who writes them) and, on the right, whichever
// participant's character sheet the DM clicks on up top.

interface DmNotes {
  publicNote: { content: string } | null;
  dmNote: { content: string } | null;
}

function DmMissionSidebar({
  quest, notes, onNotesSaved,
}: {
  quest: QuestDetail["quest"];
  notes: DmNotes | null;
  onNotesSaved: () => void;
}) {
  async function saveNote(visibility: "public" | "dm_private", content: string): Promise<boolean> {
    const res = await fetch(`/api/admin/rol/quests/${quest.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility, content }),
    });
    if (res.ok) onNotesSaved();
    return res.ok;
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="surface-parchment p-4">
        <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-2.5">Descripción</h2>
        <p className="font-body text-sm leading-relaxed text-ink-light whitespace-pre-wrap">{quest.description}</p>
      </section>

      <section className="surface-parchment p-4">
        <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-2.5">Recompensas</h2>
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <RewardStat icon={Coins} label="Zenit" value={`${quest.reward_coin}z`} />
          <RewardStat icon={Trophy} label="Pts. de gremio" value={String(quest.reward_standing)} />
          <RewardStat icon={Boxes} label="Suministros" value={String(quest.reward_supplies)} />
        </div>
        <p className="mt-3 font-body text-2xs text-ink-light">
          Hasta {quest.max_participants} participante{quest.max_participants !== 1 ? "s" : ""}
          {quest.scheduled_date && <> · {new Date(quest.scheduled_date + "T00:00:00").toLocaleDateString("es-AR")}</>}
          {" "}· {quest.session_count} sesión{quest.session_count !== 1 ? "es" : ""}
        </p>
      </section>

      <section className="surface-parchment p-4">
        {notes ? (
          <NoteEditor
            label="Notas públicas (todos ven esto)"
            initialContent={notes.publicNote?.content ?? ""}
            onSave={(c) => saveNote("public", c)}
          />
        ) : (
          <p className="font-body text-sm italic text-ink-light">Cargando notas…</p>
        )}
      </section>

      <section className="surface-parchment p-4">
        {notes ? (
          <NoteEditor
            label="Notas privadas del DM"
            initialContent={notes.dmNote?.content ?? ""}
            onSave={(c) => saveNote("dm_private", c)}
            placeholder="Solo vos ves esto."
          />
        ) : (
          <p className="font-body text-sm italic text-ink-light">Cargando notas…</p>
        )}
      </section>
    </div>
  );
}

interface FullCharacter { sheet_data: FUCharacter; portrait_url: string | null; full_body_url: string | null }

function DmCharacterPanel({ characterId }: { characterId: string | null }) {
  const [data, setData] = React.useState<FullCharacter | null | undefined>(undefined);

  React.useEffect(() => {
    if (!characterId) { setData(undefined); return; }
    let cancelled = false;
    setData(undefined);
    fetch(`/api/rol/characters/${characterId}`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setData(json.data ?? null); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [characterId]);

  async function handleUpdate(updated: FUCharacter) {
    if (!data || !characterId) return;
    setData({ ...data, sheet_data: updated });
    await fetch(`/api/rol/characters/${characterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: updated.name, sheet_data: updated, portrait_url: data.portrait_url, full_body_url: data.full_body_url }),
    });
  }

  async function handleImagesChange(portraitUrl: string | null, fullBodyUrl: string | null) {
    if (!data || !characterId) return;
    setData({ ...data, portrait_url: portraitUrl, full_body_url: fullBodyUrl });
    await fetch(`/api/rol/characters/${characterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.sheet_data.name, sheet_data: data.sheet_data, portrait_url: portraitUrl, full_body_url: fullBodyUrl }),
    });
  }

  if (!characterId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="font-body italic text-ink-light">Elegí un participante arriba para ver su ficha.</p>
      </div>
    );
  }
  if (data === undefined) return <p className="font-body italic text-ink-light px-2">Cargando ficha…</p>;
  if (data === null) return <p className="font-body italic text-ink-light px-2">No se pudo cargar el personaje.</p>;

  return (
    <CharacterSheet
      character={data.sheet_data}
      portraitUrl={data.portrait_url}
      fullBodyUrl={data.full_body_url}
      backHref="/rol/characters"
      hideBackLink
      onUpdate={handleUpdate}
      onImagesChange={handleImagesChange}
    />
  );
}

function DmQuestView({ detail, onReload }: { detail: QuestDetail; onReload: () => void }) {
  const { quest, participants } = detail;
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState<DmNotes | null>(null);

  const loadNotes = React.useCallback(async () => {
    const res = await fetch(`/api/admin/rol/quests/${quest.id}/notes`);
    const json = await res.json();
    const rows: { visibility: string; content: string }[] = res.ok ? json.data ?? [] : [];
    setNotes({
      publicNote: rows.find((n) => n.visibility === "public") ?? null,
      dmNote: rows.find((n) => n.visibility === "dm_private") ?? null,
    });
  }, [quest.id]);

  React.useEffect(() => { loadNotes(); }, [loadNotes]);

  return (
    <div className="w-full">
      <div className="w-full bg-[#1c1810] border-b border-brass/25 px-4 py-4 md:px-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/15 text-brass shrink-0">
            {STATUS_LABELS[quest.status]}
          </span>
          <h1 className="font-display text-xl text-parchment">{quest.title}</h1>
        </div>
        {participants.length === 0 ? (
          <p className="font-body text-sm italic text-parchment-dark">Todavía no hay participantes confirmados.</p>
        ) : (
          <div className="flex items-center gap-6 overflow-x-auto pb-1">
            {participants.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-1.5 transition-opacity",
                  selectedId && selectedId !== p.id && "opacity-50 hover:opacity-80"
                )}
              >
                <ParticipantPortrait p={p} big />
                <span className="font-label text-sm text-parchment">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 p-4 md:p-6 lg:grid-cols-[360px_1fr] items-start">
        <DmMissionSidebar quest={quest} notes={notes} onNotesSaved={() => { loadNotes(); onReload(); }} />
        <div className="min-w-0 surface-parchment">
          <DmCharacterPanel characterId={selectedId} />
        </div>
      </div>
    </div>
  );
}

export default function RolQuestDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = React.useState<QuestDetail | null | undefined>(undefined);
  const [withdrawing, setWithdrawing] = React.useState(false);
  const [turningIn, setTurningIn] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch(`/api/rol/quests/${params.id}`);
    const json = await res.json();
    setDetail(res.ok ? json.data : null);
  }, [params.id]);

  React.useEffect(() => { load(); }, [load]);

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

  if (detail.isRolAdmin) {
    return <DmQuestView detail={detail} onReload={load} />;
  }

  const { quest, participants, myCharacterId, myApplication, leaderVotes, isLeader, eligibleFeatures, publicNote } = detail;
  const leader = quest.leader_character_id ? participants.find((p) => p.id === quest.leader_character_id) : null;

  return (
    <>
      <MissionTopBar quest={quest} participants={participants} />

      <main className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6">
        <section className="surface-parchment p-5">
          <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">Descripción</h2>
          <p className="font-body text-sm leading-relaxed text-ink-light whitespace-pre-wrap">{quest.description}</p>
        </section>

        <section className="surface-parchment p-5">
          <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">Recompensas</h2>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <RewardStat icon={Coins} label="Zenit" value={`${quest.reward_coin}z`} />
            <RewardStat icon={Trophy} label="Pts. de gremio" value={String(quest.reward_standing)} />
            <RewardStat icon={Boxes} label="Suministros" value={String(quest.reward_supplies)} />
          </div>
          <p className="mt-3 font-body text-2xs text-ink-light">
            Hasta {quest.max_participants} participante{quest.max_participants !== 1 ? "s" : ""}
            {quest.scheduled_date && <> · {new Date(quest.scheduled_date + "T00:00:00").toLocaleDateString("es-AR")}</>}
            {" "}· {quest.session_count} sesión{quest.session_count !== 1 ? "es" : ""}
          </p>
        </section>

        <section className="surface-parchment p-5">
          <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">Notas públicas</h2>
          <Textarea rows={5} value={publicNote?.content ?? ""} readOnly placeholder="El DM todavía no dejó notas sobre esta misión." />
        </section>

        {quest.status === "available" && (
          <section className="surface-parchment p-5">
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
          <section className="surface-parchment p-5">
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
          <section className="surface-parchment p-5">
            <p className="font-body text-sm text-ink-light">
              {leader?.name ?? "El líder"} entregó esta misión — esperando que el DM la acepte.
            </p>
          </section>
        )}

        {quest.status === "accepted" && (
          <section className="surface-parchment p-5">
            <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-3">Reparto de suministros</h2>
            {isLeader ? (
              <AllocateSection questId={quest.id} remaining={quest.supplies_pool_remaining} features={eligibleFeatures} onChanged={load} />
            ) : (
              <p className="font-body italic text-ink-light text-sm">
                {leader?.name ?? "El líder"} está asignando los {quest.supplies_pool_remaining} suministros restantes a funciones del gremio.
              </p>
            )}
          </section>
        )}
      </main>
    </>
  );
}
