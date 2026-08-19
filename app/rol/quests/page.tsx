"use client";

import * as React from "react";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { RolQuestPaperCard } from "@/components/rol/QuestPaperCard";
import type { RolQuestStatus, ShgRolQuest } from "@/types/database";

const STATUS_LABELS: Record<RolQuestStatus, string> = { available: "Disponible", active: "Activa", completed: "Completada" };
const STATUS_STYLES: Record<RolQuestStatus, string> = {
  available: "bg-brass/15 text-brass",
  active: "bg-moss/15 text-moss-dark",
  completed: "bg-leather/10 text-leather",
};

export default function RolQuestsPage() {
  const [available, setAvailable] = React.useState<ShgRolQuest[]>([]);
  const [mine, setMine] = React.useState<ShgRolQuest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/rol/quests")
      .then((r) => r.json())
      .then((json) => {
        setAvailable(json.data?.available ?? []);
        setMine(json.data?.mine ?? []);
        setLoading(false);
      });
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
              <div className="quest-board-frame rounded-md overflow-hidden">
                <div className="quest-board-safe">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 justify-items-center gap-6">
                    {available.map((q, i) => (
                      <RolQuestPaperCard key={q.id} index={mine.length + i}>
                        <p className="font-label text-sm font-semibold text-ink line-clamp-2">{q.title}</p>
                        <p className="font-body text-xs text-ink-light leading-snug line-clamp-5 shrink-0">{q.description}</p>
                        <div className="mt-1">
                          <span className="block text-center font-label text-2xs uppercase tracking-wide px-3 py-2 border border-border text-ink-light">
                            {STATUS_LABELS.available}
                          </span>
                        </div>
                      </RolQuestPaperCard>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
