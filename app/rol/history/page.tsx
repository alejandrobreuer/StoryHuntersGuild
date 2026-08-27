"use client";

import * as React from "react";
import { ScrollText, Lock } from "lucide-react";
import { formatDateTime } from "@/lib/formatting";

interface HistoryRow {
  id: string;
  title: string;
  completed_at: string | null;
  history_summary: string | null;
  reward_coin: number;
  reward_standing: number;
  reward_supplies: number;
  participants: { id: string; name: string }[];
  supply_allocations: { amount: number; feature_title: string }[];
}

interface HistoryResponse {
  data: HistoryRow[] | null;
  locked: boolean;
  gateFeatureTitle?: string;
}

export default function RolHistoryPage() {
  const [response, setResponse] = React.useState<HistoryResponse | null>(null);

  React.useEffect(() => {
    fetch("/api/rol/history")
      .then((r) => r.json())
      .then((json) => setResponse(json));
  }, []);

  return (
    <main className="max-w-3xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment text-center mb-2">Historial del Gremio</h1>
      <p className="font-body text-sm text-parchment-dark text-center mb-10">
        Cada misión completada, con sus participantes y recompensas.
      </p>

      {response === null ? (
        <p className="font-body italic text-parchment-dark text-center">Cargando…</p>
      ) : response.locked ? (
        <div className="text-center py-16">
          <Lock size={28} className="mx-auto text-parchment-dark/60 mb-3" />
          <p className="font-body italic text-parchment-dark">
            El historial todavía no está disponible — el gremio necesita desbloquear la función
            {response.gateFeatureTitle ? ` "${response.gateFeatureTitle}"` : ""}.
          </p>
        </div>
      ) : !response.data || response.data.length === 0 ? (
        <div className="text-center py-16">
          <ScrollText size={28} className="mx-auto text-parchment-dark/60 mb-3" />
          <p className="font-body italic text-parchment-dark">Todavía no hay misiones completadas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {response.data.map((r) => (
            <div key={r.id} className="surface-parchment p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                <p className="font-label text-sm font-bold text-ink">{r.title}</p>
                <p className="font-body text-xs text-ink-light">{r.completed_at ? formatDateTime(r.completed_at) : ""}</p>
              </div>
              <p className="font-body text-xs text-ink-light mb-1">
                {r.participants.map((p) => p.name).join(", ") || "Sin participantes"}
              </p>
              {r.history_summary && (
                <p className="font-body text-sm text-ink-light mb-1.5 whitespace-pre-line">{r.history_summary}</p>
              )}
              <p className="font-body text-2xs text-brass">
                {r.reward_coin} monedas · {r.reward_standing} pts. de gremio · {r.reward_supplies} suministros
              </p>
              {r.supply_allocations.length > 0 && (
                <p className="font-body text-2xs text-ink-light mt-1">
                  Suministros asignados: {r.supply_allocations.map((a) => `${a.feature_title} (+${a.amount})`).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
