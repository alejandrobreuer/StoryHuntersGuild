"use client";

import * as React from "react";
import type { FUReferenceData } from "../data/referenceDataType";
import { useReferenceData } from "./useReferenceData";

const ReferenceDataContext = React.createContext<FUReferenceData | null>(null);

/**
 * Fetches Fabula Ultima reference data once and makes it available to every
 * descendant via useReferenceDataContext() — avoids prop-drilling it through
 * every class/skill/equipment/status-effect-aware component under the
 * character sheet and the creation wizard.
 */
export function ReferenceDataProvider({ children }: { children: React.ReactNode }) {
  const { data, error } = useReferenceData();

  if (error) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center font-body text-crimson">{error}</p>;
  }
  if (!data) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center font-body text-parchment-dark">Cargando datos de reglas…</p>;
  }
  return <ReferenceDataContext.Provider value={data}>{children}</ReferenceDataContext.Provider>;
}

export function useReferenceDataContext(): FUReferenceData {
  const ctx = React.useContext(ReferenceDataContext);
  if (!ctx) throw new Error("useReferenceDataContext must be used within a ReferenceDataProvider");
  return ctx;
}
