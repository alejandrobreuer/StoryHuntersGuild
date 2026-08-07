"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useWizard } from "../../../lib/wizardState";
import { themes } from "../../../data/tables";
import { InfoDisclosure } from "../../shared/InfoDisclosure";

export function Step2Theme() {
  const { draft, dispatch } = useWizard();
  const matchesSuggested = themes.some((t) => t.name === draft.theme);
  const [customMode, setCustomMode] = useState(draft.theme !== "" && !matchesSuggested);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="fu-heading text-2xl font-bold text-[var(--fu-gold-bright)]">Theme</h2>
        <p className="mt-2 flex items-start text-sm text-[var(--fu-text-muted)]">
          A strong ideal, emotion or feeling that dominates your character&apos;s actions.
          <InfoDisclosure label="Why Theme matters">
            If an entire scene were built around your character, their Theme would be its
            dominant focus. Describe how it applies to them — what is their Ambition? What Duty
            are they bound by? Who is the target of their Vengeance? Like Identity, you can
            invoke it on Checks and change it later as the story evolves.
          </InfoDisclosure>
        </p>
      </header>

      {!customMode ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {themes.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => dispatch({ type: "SET_THEME", value: t.name })}
              className={cn(
                "fu-panel p-3 text-left transition-colors hover:border-[var(--fu-border-bright)]",
                draft.theme === t.name && "border-[var(--fu-gold)] bg-[var(--fu-panel-hover)]",
              )}
            >
              <div className="fu-heading text-sm font-semibold text-[var(--fu-text)]">{t.name}</div>
              <div className="mt-1 text-[11px] leading-snug text-[var(--fu-text-muted)]">{t.description}</div>
            </button>
          ))}
        </div>
      ) : (
        <input
          value={draft.theme}
          onChange={(e) => dispatch({ type: "SET_THEME", value: e.target.value })}
          placeholder="Describe your own Theme"
          className="w-full rounded-md border border-[var(--fu-border)] bg-[var(--fu-bg-elevated)] p-3 text-[var(--fu-text)] placeholder:text-[var(--fu-text-muted)]/50 focus:border-[var(--fu-gold)] focus:outline-none"
        />
      )}

      <button
        type="button"
        onClick={() => setCustomMode((m) => !m)}
        className="fu-label text-xs text-[var(--fu-cyan)] underline decoration-dotted underline-offset-4 hover:text-[var(--fu-cyan-bright,var(--fu-cyan))]"
      >
        {customMode ? "Choose from suggested Themes instead" : "Write a custom Theme instead"}
      </button>
    </div>
  );
}
