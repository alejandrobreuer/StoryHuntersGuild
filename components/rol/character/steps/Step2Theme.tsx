"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useWizard } from "@/app/FU/lib/wizardState";
import { themes } from "@/app/FU/data/tables";
import { InfoDisclosure } from "../InfoDisclosure";

export function Step2Theme() {
  const { draft, dispatch } = useWizard();
  const matchesSuggested = themes.some((t) => t.name === draft.theme);
  const [customMode, setCustomMode] = useState(draft.theme !== "" && !matchesSuggested);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-brass-bright">Tema</h2>
        <p className="mt-2 flex items-start text-sm text-ink-light font-body">
          Un ideal, emoción o sentimiento fuerte que domina las acciones de tu personaje.
          <InfoDisclosure label="Por qué importa el Tema">
            Si una escena entera girara en torno a tu personaje, su Tema sería el foco dominante.
            Como con la Identidad, podés invocarlo en las Checks y cambiarlo más adelante a medida
            que avanza la historia.
          </InfoDisclosure>
        </p>
      </header>

      {!customMode ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {themes.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => dispatch({ type: "SET_THEME", value: t.name })}
              className={cn(
                "surface-parchment p-4 text-left transition-colors hover:border-brass",
                draft.theme === t.name && "border-brass bg-brass/10"
              )}
            >
              <div className="font-display text-sm font-semibold text-ink">{t.name}</div>
              <div className="mt-1 text-xs leading-snug text-ink-light font-body">{t.description}</div>
            </button>
          ))}
        </div>
      ) : (
        <input
          value={draft.theme}
          onChange={(e) => dispatch({ type: "SET_THEME", value: e.target.value })}
          placeholder="Describí tu propio Tema"
          className="w-full max-w-2xl border border-border bg-parchment/60 p-4 text-base text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body"
        />
      )}

      <button
        type="button"
        onClick={() => setCustomMode((m) => !m)}
        className="font-label text-xs uppercase tracking-wide text-moss underline decoration-dotted underline-offset-4 hover:text-moss-light"
      >
        {customMode ? "Elegir entre los Temas sugeridos" : "Escribir un Tema propio"}
      </button>
    </div>
  );
}
