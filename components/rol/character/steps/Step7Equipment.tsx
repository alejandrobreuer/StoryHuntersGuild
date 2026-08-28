"use client";

import { Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { calcSpent, rollSavings } from "@/app/FU/lib/derivedStats";
import { STARTING_BUDGET } from "@/app/FU/lib/types";
import { useWizard } from "@/app/FU/lib/wizardState";
import { useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import { InfoDisclosure } from "../InfoDisclosure";
import { EquipmentBoard } from "../EquipmentBoard";

export function Step7Equipment() {
  const { draft, dispatch } = useWizard();
  const ref = useReferenceDataContext();
  const spent = calcSpent(draft.equipment, ref);
  const remaining = STARTING_BUDGET - spent;
  const overspent = remaining < 0;
  const leftover = Math.max(0, remaining);
  const totalZenit = leftover + (draft.savingsRoll ?? 0);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-brass-bright">Equipo y ahorros</h2>
        <p className="mt-2 flex items-start text-sm text-ink-light font-body">
          Gastá tu presupuesto inicial de 500 zenit en armas, armadura y un escudo.
          <InfoDisclosure label="Por qué importa el equipo">
            Por defecto solo podés comprar equipo básico — los ítems marciales necesitan una Clase
            que los otorgue. Lo que sobre pasa a tus ahorros, junto con una tirada de 2d6×10.
          </InfoDisclosure>
        </p>
      </header>

      <div className={cn("surface-parchment flex flex-wrap items-center justify-between gap-4 p-5", overspent && "border-crimson")}>
        <div>
          <span className="font-label text-xs uppercase tracking-wide text-ink-light">Presupuesto</span>
          <div className="font-display text-xl font-bold">
            <span className={overspent ? "text-crimson" : "text-brass-bright"}>{remaining}</span>
            <span className="text-sm text-ink-light font-body"> / {STARTING_BUDGET} z restantes</span>
          </div>
          {overspent && <p className="mt-1 text-xs text-crimson font-body">Te pasaste del presupuesto — sacá un ítem.</p>}
        </div>
        <div className="h-3 w-full flex-1 overflow-hidden rounded-full bg-parchment-dark/40 sm:w-48">
          <div className={cn("h-full transition-all", overspent ? "bg-crimson" : "bg-brass")} style={{ width: `${Math.min(100, (spent / STARTING_BUDGET) * 100)}%` }} />
        </div>
      </div>

      <EquipmentBoard />

      <div className="surface-parchment flex flex-wrap items-center gap-4 p-5">
        <button
          type="button"
          disabled={overspent}
          onClick={() => dispatch({ type: "ROLL_SAVINGS", result: rollSavings() })}
          className="font-label inline-flex items-center gap-2 border border-moss-light px-4 py-2.5 text-xs uppercase tracking-wide text-moss transition-colors hover:bg-moss/10 disabled:opacity-30"
        >
          <Dices className="h-4 w-4" /> Tirar ahorros (2d6 × 10)
        </button>
        {draft.savingsRoll != null && <span className="font-display text-lg font-bold text-brass-bright">Salió {draft.savingsRoll} z</span>}
        <span className="font-label ml-auto text-xs uppercase tracking-wide text-ink-light">
          Zenit inicial: <span className="text-brass-bright">{totalZenit} z</span>
        </span>
      </div>
    </div>
  );
}
