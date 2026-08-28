"use client";

import { calcDerivedStats, type StatResult } from "@/app/FU/lib/derivedStats";
import { CHARACTER_LEVEL, STARTING_FABULA_POINTS } from "@/app/FU/lib/types";
import { selectedClasses, useWizard } from "@/app/FU/lib/wizardState";
import { useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import { InfoDisclosure } from "../InfoDisclosure";

function StatBlock({ title, result }: { title: string; result: StatResult }) {
  return (
    <div className="surface-parchment p-5">
      <div className="flex items-baseline justify-between">
        <span className="font-label text-xs uppercase tracking-wide text-ink-light">{title}</span>
        <span className="font-display text-2xl font-bold text-ink">{result.value}</span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-ink-light font-body">
        {result.breakdown.map((t, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="truncate">{t.label}</span>
            <span className={t.value < 0 ? "text-crimson" : "text-moss"}>{i > 0 && t.value >= 0 ? `+${t.value}` : t.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Step6DerivedStats() {
  const { draft } = useWizard();
  const ref = useReferenceDataContext();
  const classes = selectedClasses(draft);
  const stats = calcDerivedStats(CHARACTER_LEVEL, draft.attributes, draft.equipment, classes, [], ref);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-ink">Estadísticas derivadas</h2>
        <p className="mt-2 flex items-start text-sm text-ink-light font-body">
          Se calculan automáticamente a partir de tus Atributos y beneficios de Clase.
          <InfoDisclosure label="De dónde salen estos números">
            PV = Nivel + 5 × dado de Vigor + bonos de Clase. Crisis es la mitad de tu PV máximo,
            redondeado hacia abajo. PM = Nivel + 5 × dado de Voluntad + bonos de Clase. PI empieza
            en 6 fijo.
          </InfoDisclosure>
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock title="Puntos de Vida" result={stats.hp} />
        <StatBlock title="Crisis" result={stats.crisis} />
        <StatBlock title="Puntos de Mente" result={stats.mp} />
        <StatBlock title="Puntos de Inventario" result={stats.ip} />
        <StatBlock title="Defensa" result={stats.defense} />
        <StatBlock title="Defensa Mágica" result={stats.magicDefense} />
        <StatBlock title="Iniciativa" result={stats.initiative} />
        <div className="surface-parchment p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-label text-xs uppercase tracking-wide text-ink-light">Puntos de Fábula</span>
            <span className="font-display text-2xl font-bold text-ink">{STARTING_FABULA_POINTS}</span>
          </div>
          <p className="mt-2 text-xs text-ink-light font-body">Todo personaje empieza el juego con 3 Puntos de Fábula.</p>
        </div>
      </div>
    </div>
  );
}
