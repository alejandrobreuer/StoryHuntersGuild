"use client";

import * as React from "react";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <main className="max-w-4xl mx-auto px-6 py-14">
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
              <div className="flex flex-col gap-2.5">
                {mine.map((q) => (
                  <Link key={q.id} href={`/rol/quests/${q.id}`} className="surface-parchment p-4 flex items-center justify-between gap-3 block">
                    <div className="min-w-0">
                      <p className="font-label text-sm font-bold text-ink">{q.title}</p>
                      <p className="font-body text-xs text-ink-light line-clamp-1">{q.description}</p>
                    </div>
                    <span className={cn("font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm shrink-0", STATUS_STYLES[q.status])}>
                      {STATUS_LABELS[q.status]}
                    </span>
                  </Link>
                ))}
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
              <div className="flex flex-col gap-2.5">
                {available.map((q) => (
                  <div key={q.id} className="surface-parchment p-4">
                    <p className="font-label text-sm font-bold text-ink">{q.title}</p>
                    <p className="font-body text-xs text-ink-light">{q.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
