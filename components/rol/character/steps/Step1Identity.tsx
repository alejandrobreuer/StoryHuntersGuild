"use client";

import { Dices } from "lucide-react";
import { useWizard } from "@/app/FU/lib/wizardState";
import { identityTables } from "@/app/FU/data/tables";
import { InfoDisclosure } from "../InfoDisclosure";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollIdentity(): string {
  const adj1 = pick(identityTables.adjectives);
  let adj2 = pick(identityTables.adjectives);
  while (adj2 === adj1) adj2 = pick(identityTables.adjectives);
  const concept = pick(identityTables.coreConcept);
  const includeDetail = Math.random() < 0.65;
  const detail = includeDetail ? pick(identityTables.details) : null;
  const base = `${adj1} ${adj2} ${concept}`;
  return detail ? `${base} ${detail}` : base;
}

export function Step1Identity() {
  const { draft, dispatch } = useWizard();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-brass-bright">Identidad</h2>
        <p className="mt-2 flex items-start text-sm text-ink-light font-body">
          Una frase corta que resuma cómo se ve tu personaje a sí mismo ahora mismo.
          <InfoDisclosure label="Por qué importa la Identidad">
            Podés invocar tu Identidad para tener ventaja al hacer una Check — elegí algo que
            resulte útil en juego. Buenas identidades suenan como <em>&quot;Caballero Real&quot;</em> o{" "}
            <em>&quot;Hechicero Amnésico Anciano&quot;</em>: contundentes, evocativas y abiertas a
            cambiar más adelante.
          </InfoDisclosure>
        </p>
      </header>

      <textarea
        value={draft.identity}
        onChange={(e) => dispatch({ type: "SET_IDENTITY", value: e.target.value })}
        placeholder="ej. Hechicero Amnésico Anciano"
        rows={2}
        className="w-full max-w-2xl resize-none border border-border bg-parchment/60 p-4 text-base text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body"
      />

      <div>
        <button
          type="button"
          onClick={() => dispatch({ type: "SET_IDENTITY", value: rollIdentity() })}
          className="font-label inline-flex items-center gap-2 border border-moss-light px-4 py-2.5 text-xs uppercase tracking-wide text-moss transition-colors hover:bg-moss/10"
        >
          <Dices className="h-4 w-4" /> Tirar por mí
        </button>
        <p className="mt-2 text-xs text-ink-light font-body">
          Se arma con las tablas de Concepto Central / Adjetivo / Detalle — editala libremente.
        </p>
      </div>
    </div>
  );
}
