"use client";

import { Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { calcSpent, rollSavings } from "../../../lib/derivedStats";
import { STARTING_BUDGET } from "../../../lib/types";
import { useWizard } from "../../../lib/wizardState";
import { InfoDisclosure } from "../../shared/InfoDisclosure";
import { EquipmentBoard } from "../EquipmentBoard";

export function Step7Equipment() {
  const { draft, dispatch } = useWizard();
  const spent = calcSpent(draft.equipment);
  const remaining = STARTING_BUDGET - spent;
  const overspent = remaining < 0;
  const leftover = Math.max(0, remaining);
  const totalZenit = leftover + (draft.savingsRoll ?? 0);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="fu-heading text-2xl font-bold text-[var(--fu-gold-bright)]">Equipment &amp; Savings</h2>
        <p className="mt-2 flex items-start text-sm text-[var(--fu-text-muted)]">
          Spend your 500 zenit starting budget on weapons, armor and a shield.
          <InfoDisclosure label="Why equipment matters">
            By default you can only buy basic gear — martial (E) items need a Class that grants
            them. Any zenit left over rolls into your starting savings, together with a 2d6×10
            roll.
          </InfoDisclosure>
        </p>
      </header>

      <div
        className={cn(
          "fu-panel flex flex-wrap items-center justify-between gap-3 p-4",
          overspent && "border-[var(--fu-danger)]",
        )}
      >
        <div>
          <span className="fu-label text-[10px] text-[var(--fu-text-muted)]">Budget</span>
          <div className="fu-heading text-xl font-bold">
            <span className={overspent ? "text-[var(--fu-danger)]" : "text-[var(--fu-gold-bright)]"}>
              {remaining}
            </span>
            <span className="text-sm text-[var(--fu-text-muted)]"> / {STARTING_BUDGET} z remaining</span>
          </div>
          {overspent && <p className="mt-1 text-xs text-[var(--fu-danger)]">Over budget — remove an item.</p>}
        </div>
        <div className="h-2 w-full flex-1 overflow-hidden rounded-full bg-[var(--fu-bg-elevated)] sm:w-48">
          <div
            className={cn("h-full transition-all", overspent ? "bg-[var(--fu-danger)]" : "bg-[var(--fu-gold)]")}
            style={{ width: `${Math.min(100, (spent / STARTING_BUDGET) * 100)}%` }}
          />
        </div>
      </div>

      <EquipmentBoard />

      <div className="fu-panel flex flex-wrap items-center gap-4 p-4">
        <button
          type="button"
          disabled={overspent}
          onClick={() => dispatch({ type: "ROLL_SAVINGS", result: rollSavings() })}
          className="fu-label inline-flex items-center gap-2 rounded-md border border-[var(--fu-cyan-dim)] px-4 py-2 text-xs text-[var(--fu-cyan)] transition-colors hover:bg-[var(--fu-cyan)]/10 disabled:opacity-30"
        >
          <Dices className="h-4 w-4" /> Roll savings (2d6 × 10)
        </button>
        {draft.savingsRoll != null && (
          <span className="fu-heading text-lg font-bold text-[var(--fu-gold-bright)]">
            Rolled {draft.savingsRoll} z
          </span>
        )}
        <span className="fu-label ml-auto text-xs text-[var(--fu-text-muted)]">
          Starting zenit:{" "}
          <span className="text-[var(--fu-gold-bright)]">{totalZenit} z</span>
        </span>
      </div>
    </div>
  );
}
