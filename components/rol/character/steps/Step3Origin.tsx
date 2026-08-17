"use client";

import { useWizard } from "@/app/FU/lib/wizardState";
import { InfoDisclosure } from "../InfoDisclosure";

export function Step3Origin() {
  const { draft, dispatch } = useWizard();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-brass-bright">Origen</h2>
        <p className="mt-2 flex items-start text-sm text-ink-light font-body">
          El lugar de donde viene tu personaje — un pueblo, una gran ciudad, o algo más fantástico.
          <InfoDisclosure label="Por qué importa el Origen">
            Igual que la Identidad y el Tema, se puede invocar para repetir una tirada en una
            Check. A diferencia de ellos, normalmente no vas a poder cambiarlo en juego.
          </InfoDisclosure>
        </p>
      </header>

      <textarea
        value={draft.origin}
        onChange={(e) => dispatch({ type: "SET_ORIGIN", value: e.target.value })}
        placeholder="ej. Platea, una otrora pacífica ciudadela en un acantilado sobre un gran lago"
        rows={3}
        className="w-full max-w-2xl resize-none border border-border bg-parchment/60 p-4 text-base text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body"
      />
    </div>
  );
}
