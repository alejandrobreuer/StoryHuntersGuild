"use client";

import { Dices } from "lucide-react";
import { characterNames } from "@/app/FU/data/tables";
import { useWizard } from "@/app/FU/lib/wizardState";

function randomName(): string {
  return characterNames[Math.floor(Math.random() * characterNames.length)];
}

const fieldClass = "w-full border border-border bg-parchment/60 p-4 text-base text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body";

export function Step8Finishing() {
  const { draft, dispatch } = useWizard();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-brass-bright">Toques finales</h2>
        <p className="mt-2 text-sm text-ink-light font-body">Nombrá a tu personaje, definí sus pronombres y describí su aspecto.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <label className="font-label text-xs uppercase tracking-wide text-ink-light">Nombre</label>
          <div className="mt-1.5 flex gap-2">
            <input value={draft.name} onChange={(e) => dispatch({ type: "SET_NAME", value: e.target.value })} placeholder="Nombre del personaje" className={fieldClass} />
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_NAME", value: randomName() })}
              aria-label="Nombre al azar"
              className="font-label flex items-center gap-1.5 border border-moss-light px-4 text-moss hover:bg-moss/10"
            >
              <Dices className="h-5 w-5" />
            </button>
          </div>
          <select
            value=""
            onChange={(e) => e.target.value && dispatch({ type: "SET_NAME", value: e.target.value })}
            className={`${fieldClass} mt-2`}
          >
            <option value="">O elegí entre nombres sugeridos…</option>
            {characterNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div>
          <label className="font-label text-xs uppercase tracking-wide text-ink-light">Pronombres</label>
          <input
            value={draft.pronouns}
            onChange={(e) => dispatch({ type: "SET_PRONOUNS", value: e.target.value })}
            placeholder="ej. ella, él, elle"
            className={`${fieldClass} mt-1.5`}
          />
        </div>
      </div>

      <div>
        <label className="font-label text-xs uppercase tracking-wide text-ink-light">Aspecto</label>
        <textarea
          value={draft.appearance}
          onChange={(e) => dispatch({ type: "SET_APPEARANCE", value: e.target.value })}
          placeholder="¿Cómo se ve? Ropa, contextura, rasgos distintivos…"
          rows={5}
          className={`${fieldClass} mt-1.5 resize-none`}
        />
      </div>
    </div>
  );
}
