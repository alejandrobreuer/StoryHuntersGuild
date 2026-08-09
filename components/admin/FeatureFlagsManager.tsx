"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ShgFeatureFlag } from "@/types/database";

export function FeatureFlagsManager() {
  const [flags, setFlags] = React.useState<ShgFeatureFlag[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/feature-flags");
    const json = await res.json();
    setFlags(json.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function toggle(flag: ShgFeatureFlag) {
    setBusyKey(flag.key);
    try {
      const res = await fetch(`/api/admin/feature-flags/${flag.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !flag.enabled }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al actualizar."); return; }
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? json.data : f)));
      toast.success(json.data.enabled ? "Función activada." : "Función desactivada.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-parchment">Funciones</h1>
        <p className="font-body text-sm text-parchment-dark mt-1">
          Activá o desactivá cada sistema del gremio (progresión, misiones, rangos, suscripciones,
          recompensas de eventos) sin tocar código — útil para ocultar algo rápido si algo no anda bien.
        </p>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {flags.map((flag) => (
            <div key={flag.key} className="surface-parchment p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-label text-sm font-bold text-ink">{flag.label}</p>
                {flag.description && <p className="font-body text-xs text-ink-light">{flag.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => toggle(flag)}
                disabled={busyKey === flag.key}
                className={`shrink-0 relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${
                  flag.enabled ? "bg-moss" : "bg-leather-light/40"
                }`}
                aria-pressed={flag.enabled}
                aria-label={`${flag.enabled ? "Desactivar" : "Activar"} ${flag.label}`}
              >
                <span
                  className={`absolute top-1 size-5 rounded-full bg-parchment transition-transform ${
                    flag.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
