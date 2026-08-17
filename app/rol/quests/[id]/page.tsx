"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RolQuestStatus, ShgRolQuestNote } from "@/types/database";

interface QuestDetail {
  quest: { id: string; title: string; description: string; status: RolQuestStatus; reward_coin: number; reward_standing: number; reward_supplies: number };
  participants: { id: string; name: string }[];
  myCharacterId: string | null;
  publicNotes: ShgRolQuestNote[];
  myThread: ShgRolQuestNote[];
}

const STATUS_LABELS: Record<RolQuestStatus, string> = { available: "Disponible", active: "Activa", completed: "Completada" };

export default function RolQuestDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = React.useState<QuestDetail | null | undefined>(undefined);
  const [note, setNote] = React.useState("");
  const [posting, setPosting] = React.useState(false);

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

  if (detail === undefined) return null;
  if (detail === null) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="font-body italic text-parchment-dark">No tenés acceso a esta misión.</p>
      </main>
    );
  }

  const { quest, participants, myCharacterId, publicNotes, myThread } = detail;

  return (
    <main className="max-w-2xl mx-auto px-6 py-14">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/15 text-brass">
          {STATUS_LABELS[quest.status]}
        </span>
      </div>
      <h1 className="font-display text-3xl text-parchment mb-3">{quest.title}</h1>
      <p className="font-body text-sm text-parchment-dark mb-6">{quest.description}</p>

      {participants.length > 0 && (
        <p className="font-body text-xs text-parchment-dark mb-8">
          Participantes: {participants.map((p) => p.name).join(", ")}
        </p>
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
