"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DieSize } from "@/app/FU/data/types";
import type { FUAttributePreset } from "@/app/FU/lib/types";
import { useWizard } from "@/app/FU/lib/wizardState";
import { InfoDisclosure } from "../InfoDisclosure";

const ATTR_ROWS = [
  { key: "dexterity" as const, label: "Destreza", blurb: "Precisión, coordinación, finesse y reflejos." },
  { key: "insight" as const, label: "Perspicacia", blurb: "Observación, comprensión y razonamiento." },
  { key: "might" as const, label: "Vigor", blurb: "Fuerza, resistencia y fortaleza física." },
  { key: "willpower" as const, label: "Voluntad", blurb: "Determinación, carisma y capacidad de influir en otros." },
];

const PRESET_LABELS: Record<Exclude<FUAttributePreset, "custom">, string> = {
  "jack-of-all-trades": "Todoterreno — d8, d8, d8, d8",
  average: "Promedio — d10, d8, d8, d6",
  specialized: "Especializado — d10, d10, d6, d6",
};

export function Step5Attributes() {
  const { draft, dispatch } = useWizard();
  const [advanced, setAdvanced] = useState(draft.attributePreset === "custom");
  const [swapPick, setSwapPick] = useState<(typeof ATTR_ROWS)[number]["key"] | null>(null);

  function handleSwapClick(key: (typeof ATTR_ROWS)[number]["key"]) {
    if (!swapPick) { setSwapPick(key); return; }
    if (swapPick === key) { setSwapPick(null); return; }
    const a = draft.attributes[swapPick];
    const b = draft.attributes[key];
    dispatch({ type: "SET_ATTRIBUTE", attribute: swapPick, value: b });
    dispatch({ type: "SET_ATTRIBUTE", attribute: key, value: a });
    setSwapPick(null);
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-ink">Atributos</h2>
        <p className="mt-2 flex items-start text-sm text-ink-light font-body">
          Definí el tamaño de dado base (d6–d12) de tus cuatro Atributos.
          <InfoDisclosure label="Por qué importan los Atributos">
            Dados más grandes significan un Atributo más entrenado. La Defensa usa Destreza, la
            Defensa Mágica usa Perspicacia, y PV/PM escalan con Vigor/Voluntad.
          </InfoDisclosure>
        </p>
      </header>

      {!advanced && (
        <select
          value={draft.attributePreset === "custom" ? "" : draft.attributePreset}
          onChange={(e) => dispatch({ type: "SET_ATTRIBUTE_PRESET", preset: e.target.value as FUAttributePreset })}
          className="w-full max-w-xl border border-border bg-parchment/60 p-4 text-sm text-ink focus:border-brass focus:outline-none font-body"
        >
          <option value="" disabled>Elegí un perfil…</option>
          {(Object.keys(PRESET_LABELS) as Exclude<FUAttributePreset, "custom">[]).map((key) => (
            <option key={key} value={key}>{PRESET_LABELS[key]}</option>
          ))}
        </select>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {ATTR_ROWS.map(({ key, label, blurb }) => (
          <div key={key} className={cn("surface-parchment flex items-center justify-between p-4", !advanced && swapPick === key && "border-2 border-brass bg-brass/15")}>
            <div>
              <div className="font-display text-base font-semibold text-ink">{label}</div>
              <div className="text-xs text-ink-light font-body">{blurb}</div>
            </div>
            {advanced ? (
              <select
                value={draft.attributes[key]}
                onChange={(e) => dispatch({ type: "SET_ATTRIBUTE", attribute: key, value: Number(e.target.value) as DieSize })}
                className="font-label border border-border bg-parchment/60 px-3 py-2 text-base font-bold text-ink focus:border-brass focus:outline-none"
              >
                {[6, 8, 10, 12].map((d) => <option key={d} value={d}>d{d}</option>)}
              </select>
            ) : (
              <button
                type="button"
                onClick={() => handleSwapClick(key)}
                className={cn(
                  "font-label border px-4 py-2 text-base font-bold text-ink hover:border-brass",
                  swapPick === key ? "border-2 border-brass bg-brass/20" : "border-border"
                )}
              >
                d{draft.attributes[key]}
              </button>
            )}
          </div>
        ))}
      </div>
      {!advanced && (
        <p className="text-xs text-ink-light font-body">
          {swapPick ? "Ahora hacé clic en otro atributo para intercambiar sus dados." : "Hacé clic en dos atributos para intercambiar sus tamaños de dado."}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          const next = !advanced;
          setAdvanced(next);
          setSwapPick(null);
          if (next) dispatch({ type: "SET_ATTRIBUTE_PRESET", preset: "custom" });
        }}
        className="font-label text-xs uppercase tracking-wide text-moss underline decoration-dotted underline-offset-4"
      >
        {advanced ? "Usar un perfil en su lugar" : "Avanzado: asignar cada atributo manualmente"}
      </button>
    </div>
  );
}
