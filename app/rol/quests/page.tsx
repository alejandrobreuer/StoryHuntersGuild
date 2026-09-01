"use client";

import * as React from "react";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { RolQuestPaperCard } from "@/components/rol/QuestPaperCard";
import { toast } from "sonner";
import type { RolQuestStatus, RolQuestApplicationStatus, ShgRolQuest } from "@/types/database";

const STATUS_LABELS: Record<RolQuestStatus, string> = {
  available: "Disponible", active: "Activa", turned_in: "Entregada", accepted: "Aceptada", completed: "Completada",
};
const STATUS_STYLES: Record<RolQuestStatus, string> = {
  available: "bg-brass/15 text-brass",
  active: "bg-moss/15 text-moss-dark",
  turned_in: "bg-brass/15 text-brass",
  accepted: "bg-moss/15 text-moss-dark",
  completed: "bg-leather/10 text-leather",
};

interface ConfirmedParticipant { id: string; name: string; portrait_url: string | null }

interface AvailableQuest extends ShgRolQuest {
  my_application: { status: RolQuestApplicationStatus; character_id: string; character_name: string } | null;
  confirmed_participants: ConfirmedParticipant[];
}

interface CharacterOption { id: string; name: string }

const APPLICATION_LABELS: Record<RolQuestApplicationStatus, string> = {
  pending: "Postulado — pendiente",
  approved: "¡Aceptado!",
  rejected: "No seleccionado",
};
const APPLICATION_STYLES: Record<RolQuestApplicationStatus, string> = {
  pending: "border-brass text-brass",
  approved: "border-moss text-moss-dark bg-moss/10",
  rejected: "border-border text-ink-light",
};

/**
 * Not-yet-started quests never link to the detail page (there's no mission
 * to summarize yet) — everything a player needs (who's confirmed, whether
 * to apply/withdraw) lives right on the card.
 */
function AvailableQuestCard({
  quest, myCharacters, onChanged,
}: {
  quest: AvailableQuest;
  myCharacters: CharacterOption[];
  onChanged: () => void;
}) {
  const [characterId, setCharacterId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function apply() {
    if (!characterId) { toast.error("Elegí un personaje."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/rol/quests/${quest.id}/apply`, {
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

  async function withdraw() {
    if (!confirm("¿Retirar tu postulación?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rol/quests/${quest.id}/apply`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al retirar la postulación."); return; }
      toast.success("Postulación retirada.");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface-parchment flex flex-col gap-2.5 p-4">
      <div>
        <p className="font-label text-sm font-semibold text-ink">{quest.title}</p>
        <p className="mt-0.5 line-clamp-4 font-body text-xs leading-snug text-ink-light">{quest.description}</p>
      </div>
      <p className="font-body text-2xs text-ink-light">
        Hasta {quest.max_participants} participante{quest.max_participants !== 1 ? "s" : ""}
        {quest.scheduled_date && <> · {new Date(quest.scheduled_date + "T00:00:00").toLocaleDateString("es-AR")}</>}
      </p>

      {quest.confirmed_participants.length > 0 && (
        <div>
          <p className="mb-1 font-label text-2xs uppercase tracking-wide text-brass">Participantes confirmados</p>
          <div className="flex flex-wrap gap-1.5">
            {quest.confirmed_participants.map((p) => (
              <span key={p.id} className="rounded-sm border border-moss/30 bg-moss/10 px-1.5 py-0.5 font-label text-2xs text-moss-dark">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-1">
        {quest.my_application ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={cn("rounded-sm border px-2 py-1 font-label text-2xs uppercase tracking-wide", APPLICATION_STYLES[quest.my_application.status])}>
              {APPLICATION_LABELS[quest.my_application.status]}
            </span>
            {quest.my_application.status !== "rejected" && (
              <button
                type="button"
                onClick={withdraw}
                disabled={busy}
                className="font-label text-2xs uppercase tracking-wide text-crimson hover:underline disabled:opacity-50"
              >
                Retirar
              </button>
            )}
          </div>
        ) : myCharacters.length === 0 ? (
          <p className="font-body text-xs italic text-ink-light">Necesitás un personaje para postularte.</p>
        ) : (
          <div className="flex gap-1.5">
            <select
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              className="min-w-0 flex-1 border border-border bg-parchment/60 px-2 py-1 font-body text-xs text-ink"
            >
              <option value="">Elegí un personaje…</option>
              {myCharacters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              type="button"
              onClick={apply}
              disabled={busy || !characterId}
              className="shrink-0 border border-crimson px-2.5 py-1 font-label text-2xs uppercase tracking-wide text-crimson transition-colors hover:bg-crimson/10 disabled:opacity-50"
            >
              Postularme
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RolQuestsPage() {
  const [available, setAvailable] = React.useState<AvailableQuest[]>([]);
  const [mine, setMine] = React.useState<ShgRolQuest[]>([]);
  const [myCharacters, setMyCharacters] = React.useState<CharacterOption[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/rol/quests");
    const json = await res.json();
    setAvailable(json.data?.available ?? []);
    setMine(json.data?.mine ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    fetch("/api/rol/characters").then((r) => r.json()).then((json) => setMyCharacters(json.data ?? []));
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-6 py-14">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl text-parchment">Misiones</h1>
        <Link href="/rol/history" className="font-label text-xs uppercase tracking-widest text-brass hover:text-brass-bright underline">
          Historial del gremio →
        </Link>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : (
        <>
          {mine.length > 0 && (
            <section className="mb-10">
              <h2 className="font-label text-sm font-bold uppercase tracking-widest text-parchment-dark mb-3">Tus misiones</h2>
              <div className="quest-board-frame rounded-md overflow-hidden">
                <div className="quest-board-safe">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 justify-items-center gap-6">
                    {mine.map((q, i) => (
                      <RolQuestPaperCard key={q.id} index={i}>
                        <div className="flex items-start justify-between gap-2 flex-wrap pr-7">
                          <p className="font-label text-sm font-semibold text-ink line-clamp-2 min-w-0">{q.title}</p>
                          <span className={cn("font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm shrink-0", STATUS_STYLES[q.status])}>
                            {STATUS_LABELS[q.status]}
                          </span>
                        </div>
                        <p className="font-body text-xs text-ink-light leading-snug line-clamp-4 shrink-0">{q.description}</p>
                        <div className="mt-1">
                          <Link
                            href={`/rol/quests/${q.id}`}
                            className="block text-center font-label text-2xs uppercase tracking-wide px-3 py-2 border border-crimson text-crimson hover:bg-crimson/10 transition-colors no-underline"
                          >
                            Ver misión
                          </Link>
                        </div>
                      </RolQuestPaperCard>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section>
            <h2 className="font-label text-sm font-bold uppercase tracking-widest text-parchment-dark mb-3">Misiones disponibles</h2>
            {available.length === 0 ? (
              <div className="text-center py-16">
                <ScrollText size={28} className="mx-auto text-parchment-dark/60 mb-3" />
                <p className="font-body italic text-parchment-dark">No hay misiones disponibles por ahora.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {available.map((q) => (
                  <AvailableQuestCard key={q.id} quest={q} myCharacters={myCharacters} onChanged={load} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
