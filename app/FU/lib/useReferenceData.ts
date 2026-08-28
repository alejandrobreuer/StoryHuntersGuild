"use client";

import * as React from "react";
import type { FUReferenceData } from "../data/referenceDataType";

/**
 * Fetches Fabula Ultima reference data (classes/equipment/status effects/
 * inventory items) from /api/rol/fu-reference once and holds it in state —
 * every consumer that used to `import { classesById } from ".../data/classes"`
 * etc. now reads it from here instead, since that data lives in the DB (see
 * app/FU/data/loadReferenceData.ts).
 */
export function useReferenceData() {
  const [data, setData] = React.useState<FUReferenceData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/rol/fu-reference")
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(json.error ?? "No se pudieron cargar los datos de reglas."); return; }
        setData(json.data);
      })
      .catch(() => { if (!cancelled) setError("No se pudieron cargar los datos de reglas."); });
    return () => { cancelled = true; };
  }, []);

  return { data, error, loading: !data && !error };
}
