"use client";

import * as React from "react";
import Link from "next/link";
import { ScrollText, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { RolQuestPaperCard } from "@/components/rol/QuestPaperCard";
import { Modal } from "@/components/ui/Modal";
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
 * Not-yet-started quests never link to a detail page (there's no mission to
 * summarize yet) — everything a player needs lives right on the board card.
 * Kept deliberately compact (title, headcount, confirmed participants, the
 * apply/withdraw control) so it actually fits the torn-paper card's tight,
 * fixed-aspect safe area — the full description lives behind the "i" button
 * instead of on the card itself.
 */
function AvailableQuestCard({
  quest, index, myCharacters, onChanged,
}: {
  quest: AvailableQuest;
  index: number;
  myCharacters: CharacterOption[];
  onChanged: () => void;
}) {
  const [characterId, setCharacterId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);

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
    <RolQuestPaperCard index={index}>
      <div className="flex items-start justify-between gap-1 pr-1">
        <p className="font-label text-sm font-semibold text-ink line-clamp-2 min-w-0">{quest.title}</p>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label="Ver descripción"
          className="flex size-5 shrink-0 items-center justify-center rounded-full border border-brass/50 text-brass transition-colors hover:bg-brass/10"
        >
          <Info size={12} />
        </button>
      </div>

      <p className="font-body text-2xs text-ink-light shrink-0">
        Hasta {quest.max_participants}
        {quest.scheduled_date && <> · {new Date(quest.scheduled_date + "T00:00:00").toLocaleDateString("es-AR")}</>}
      </p>

      {quest.confirmed_participants.length > 0 && (
        <div className="flex flex-wrap gap-1 shrink-0">
          {quest.confirmed_participants.map((p) => (
            <span key={p.id} className="rounded-sm border border-moss/30 bg-moss/10 px-1 py-0.5 font-label text-2xs text-moss-dark">
              {p.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-1 pt-1">
        {quest.my_application ? (
          <>
            <span className={cn("rounded-sm border px-1.5 py-1 text-center font-label text-2xs uppercase tracking-wide", APPLICATION_STYLES[quest.my_application.status])}>
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
          </>
        ) : myCharacters.length === 0 ? (
          <p className="font-body text-2xs italic text-ink-light">Necesitás un personaje.</p>
        ) : (
          <>
            <select
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              className="w-full border border-border bg-parchment/60 px-1 py-1 font-body text-2xs text-ink"
            >
              <option value="">Elegí personaje…</option>
              {myCharacters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              type="button"
              onClick={apply}
              disabled={busy || !characterId}
              className="border border-crimson px-2 py-1 font-label text-2xs uppercase tracking-wide text-crimson transition-colors hover:bg-crimson/10 disabled:opacity-50"
            >
              Postularme
            </button>
          </>
        )}
      </div>

      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title={quest.title}>
        <p className="whitespace-pre-wrap font-body text-sm leading-relaxed text-ink-light">{quest.description}</p>
      </Modal>
    </RolQuestPaperCard>
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
    <div className="relative min-h-[calc(100vh-60px)] w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed background, fills its container by design */}
      <img src="/images/guild-hall-wall.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-ink/40" />

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-14">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl text-parchment drop-shadow-md">Misiones</h1>
          <Link href="/rol/history" className="font-label text-xs uppercase tracking-widest text-brass hover:text-brass-bright underline">
            Historial del gremio →
          </Link>
        </div>

        {loading ? (
          <p className="font-body italic text-parchment-dark">Cargando…</p>
        ) : (
          <>
            {mine.length > 0 && (
              <section className="mb-12">
                <h2 className="font-label text-sm font-bold uppercase tracking-widest text-parchment-dark mb-3 text-center">Tus misiones</h2>
                {/* max-w-2xl: a board sized like something mounted on the wall, not stretched to fill it */}
                <div className="quest-board-frame rounded-md overflow-hidden mx-auto max-w-2xl">
                  <div className="quest-board-safe">
                    <div className="grid grid-cols-2 sm:grid-cols-3 justify-items-center gap-4">
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
              <h2 className="font-label text-sm font-bold uppercase tracking-widest text-parchment-dark mb-3 text-center">Misiones disponibles</h2>
              {available.length === 0 ? (
                <div className="text-center py-16">
                  <ScrollText size={28} className="mx-auto text-parchment-dark/60 mb-3" />
                  <p className="font-body italic text-parchment-dark">No hay misiones disponibles por ahora.</p>
                </div>
              ) : (
                <div className="quest-board-frame rounded-md overflow-hidden mx-auto max-w-2xl">
                  <div className="quest-board-safe">
                    <div className="grid grid-cols-2 sm:grid-cols-3 justify-items-center gap-4">
                      {available.map((q, i) => (
                        <AvailableQuestCard key={q.id} quest={q} index={i} myCharacters={myCharacters} onChanged={load} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
