"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DieSize } from "../../../data/types";
import type { FUAttributePreset } from "../../../lib/types";
import { useWizard } from "../../../lib/wizardState";
import { InfoDisclosure } from "../../shared/InfoDisclosure";

const ATTR_ROWS = [
  { key: "dexterity" as const, label: "Dexterity", blurb: "Precision, coordination, finesse and reflexes." },
  { key: "insight" as const, label: "Insight", blurb: "Observation, understanding and reasoning." },
  { key: "might" as const, label: "Might", blurb: "Strength, resilience and physical fortitude." },
  {
    key: "willpower" as const,
    label: "Willpower",
    blurb: "Determination, charisma and the ability to influence others.",
  },
];

const PRESET_LABELS: Record<Exclude<FUAttributePreset, "custom">, string> = {
  "jack-of-all-trades": "Jack of All Trades — d8, d8, d8, d8",
  average: "Average — d10, d8, d8, d6",
  specialized: "Specialized — d10, d10, d6, d6",
};

export function Step5Attributes() {
  const { draft, dispatch } = useWizard();
  const [advanced, setAdvanced] = useState(draft.attributePreset === "custom");
  const [swapPick, setSwapPick] = useState<(typeof ATTR_ROWS)[number]["key"] | null>(null);

  function handleSwapClick(key: (typeof ATTR_ROWS)[number]["key"]) {
    if (!swapPick) {
      setSwapPick(key);
      return;
    }
    if (swapPick === key) {
      setSwapPick(null);
      return;
    }
    const a = draft.attributes[swapPick];
    const b = draft.attributes[key];
    dispatch({ type: "SET_ATTRIBUTE", attribute: swapPick, value: b });
    dispatch({ type: "SET_ATTRIBUTE", attribute: key, value: a });
    setSwapPick(null);
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="fu-heading text-2xl font-bold text-[var(--fu-gold-bright)]">Attributes</h2>
        <p className="mt-2 flex items-start text-sm text-[var(--fu-text-muted)]">
          Set the base die size (d6–d12) of your four Attributes.
          <InfoDisclosure label="Why Attributes matter">
            Bigger die sizes mean a more trained Attribute or stronger natural talent. Take your
            Class and Skill choices into account: Defense uses Dexterity, Magic Defense uses
            Insight, and HP/MP scale off Might/Willpower.
          </InfoDisclosure>
        </p>
      </header>

      {!advanced && (
        <select
          value={draft.attributePreset === "custom" ? "" : draft.attributePreset}
          onChange={(e) =>
            dispatch({ type: "SET_ATTRIBUTE_PRESET", preset: e.target.value as FUAttributePreset })
          }
          className="w-full rounded-md border border-[var(--fu-border)] bg-[var(--fu-bg-elevated)] p-3 text-sm text-[var(--fu-text)] focus:border-[var(--fu-gold)] focus:outline-none"
        >
          <option value="" disabled>
            Choose a profile…
          </option>
          {(Object.keys(PRESET_LABELS) as Exclude<FUAttributePreset, "custom">[]).map((key) => (
            <option key={key} value={key}>
              {PRESET_LABELS[key]}
            </option>
          ))}
        </select>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {ATTR_ROWS.map(({ key, label, blurb }) => (
          <div
            key={key}
            className={cn(
              "fu-panel flex items-center justify-between p-3",
              !advanced && swapPick === key && "border-[var(--fu-gold)]",
            )}
          >
            <div>
              <div className="fu-heading text-sm font-semibold text-[var(--fu-text)]">{label}</div>
              <div className="text-[10px] text-[var(--fu-text-muted)]">{blurb}</div>
            </div>
            {advanced ? (
              <select
                value={draft.attributes[key]}
                onChange={(e) =>
                  dispatch({ type: "SET_ATTRIBUTE", attribute: key, value: Number(e.target.value) as DieSize })
                }
                className="fu-label rounded-md border border-[var(--fu-border)] bg-[var(--fu-bg-elevated)] px-2 py-1.5 text-sm font-bold text-[var(--fu-gold-bright)] focus:border-[var(--fu-gold)] focus:outline-none"
              >
                {[6, 8, 10, 12].map((d) => (
                  <option key={d} value={d}>
                    d{d}
                  </option>
                ))}
              </select>
            ) : (
              <button
                type="button"
                onClick={() => handleSwapClick(key)}
                className="fu-label rounded-md border border-[var(--fu-border)] px-3 py-1.5 text-sm font-bold text-[var(--fu-gold-bright)] hover:border-[var(--fu-gold)]"
              >
                d{draft.attributes[key]}
              </button>
            )}
          </div>
        ))}
      </div>
      {!advanced && (
        <p className="text-[11px] text-[var(--fu-text-muted)]">
          {swapPick
            ? "Now click another attribute to swap die sizes with it."
            : "Click two attributes to swap their assigned die sizes."}
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
        className="fu-label text-xs text-[var(--fu-cyan)] underline decoration-dotted underline-offset-4"
      >
        {advanced ? "Use a preset instead" : "Advanced: assign each attribute manually"}
      </button>
    </div>
  );
}
