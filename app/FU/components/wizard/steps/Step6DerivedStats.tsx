"use client";

import { calcDerivedStats, type StatResult } from "../../../lib/derivedStats";
import { CHARACTER_LEVEL, STARTING_FABULA_POINTS } from "../../../lib/types";
import { selectedClasses, useWizard } from "../../../lib/wizardState";
import { InfoDisclosure } from "../../shared/InfoDisclosure";

function StatBlock({ title, result }: { title: string; result: StatResult }) {
  return (
    <div className="fu-panel p-5">
      <div className="flex items-baseline justify-between">
        <span className="fu-label text-sm text-[var(--fu-text-muted)]">{title}</span>
        <span className="fu-heading text-3xl font-bold text-[var(--fu-gold-bright)]">{result.value}</span>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-[var(--fu-text-muted)]">
        {result.breakdown.map((t, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="truncate">{t.label}</span>
            <span className={t.value < 0 ? "text-[var(--fu-danger)]" : "text-[var(--fu-cyan)]"}>
              {i > 0 && t.value >= 0 ? `+${t.value}` : t.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Step6DerivedStats() {
  const { draft } = useWizard();
  const classes = selectedClasses(draft);
  const stats = calcDerivedStats(CHARACTER_LEVEL, draft.attributes, draft.equipment, classes);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="fu-heading text-3xl font-bold text-[var(--fu-gold-bright)]">Derived Stats</h2>
        <p className="mt-2 flex items-start text-base text-[var(--fu-text-muted)]">
          Calculated automatically from your Attributes and Class benefits — nothing to fill in here.
          <InfoDisclosure label="Where these numbers come from">
            HP = Level + 5 × Might die + Class bonuses. Crisis is half your max HP, rounded down.
            MP = Level + 5 × Willpower die + Class bonuses. IP starts at a flat 6. Defense and
            Magic Defense currently equal your Dexterity/Insight die — they&apos;ll shift once
            you pick armor and a shield in the next step.
          </InfoDisclosure>
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock title="Hit Points" result={stats.hp} />
        <StatBlock title="Crisis" result={stats.crisis} />
        <StatBlock title="Mind Points" result={stats.mp} />
        <StatBlock title="Inventory Points" result={stats.ip} />
        <StatBlock title="Defense" result={stats.defense} />
        <StatBlock title="Magic Defense" result={stats.magicDefense} />
        <StatBlock title="Initiative" result={stats.initiative} />
        <div className="fu-panel p-5">
          <div className="flex items-baseline justify-between">
            <span className="fu-label text-sm text-[var(--fu-text-muted)]">Fabula Points</span>
            <span className="fu-heading text-3xl font-bold text-[var(--fu-gold-bright)]">
              {STARTING_FABULA_POINTS}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--fu-text-muted)]">
            Every Player Character begins play with 3 Fabula Points.
          </p>
        </div>
      </div>
    </div>
  );
}
