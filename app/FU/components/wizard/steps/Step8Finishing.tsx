"use client";

import { Dices } from "lucide-react";
import { characterNames } from "../../../data/tables";
import { useWizard } from "../../../lib/wizardState";

function randomName(): string {
  return characterNames[Math.floor(Math.random() * characterNames.length)];
}

const fieldClass =
  "w-full rounded-md border border-[var(--fu-border)] bg-[var(--fu-bg-elevated)] p-4 text-lg text-[var(--fu-text)] placeholder:text-[var(--fu-text-muted)]/50 focus:border-[var(--fu-gold)] focus:outline-none";

export function Step8Finishing() {
  const { draft, dispatch } = useWizard();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="fu-heading text-3xl font-bold text-[var(--fu-gold-bright)]">Finishing Touches</h2>
        <p className="mt-2 text-base text-[var(--fu-text-muted)]">
          Name your character, set their pronouns, and describe how they look.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <label className="fu-label text-sm text-[var(--fu-text-muted)]">Name</label>
          <div className="mt-1.5 flex gap-2">
            <input
              value={draft.name}
              onChange={(e) => dispatch({ type: "SET_NAME", value: e.target.value })}
              placeholder="Character name"
              className={fieldClass}
            />
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_NAME", value: randomName() })}
              aria-label="Random name"
              className="fu-label flex items-center gap-1.5 rounded-md border border-[var(--fu-cyan-dim)] px-4 text-[var(--fu-cyan)] hover:bg-[var(--fu-cyan)]/10"
            >
              <Dices className="h-5 w-5" />
            </button>
          </div>
          <select
            value=""
            onChange={(e) => e.target.value && dispatch({ type: "SET_NAME", value: e.target.value })}
            className={`${fieldClass} mt-2`}
          >
            <option value="">Or pick from suggested names…</option>
            {characterNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="fu-label text-sm text-[var(--fu-text-muted)]">Pronouns</label>
          <input
            value={draft.pronouns}
            onChange={(e) => dispatch({ type: "SET_PRONOUNS", value: e.target.value })}
            placeholder="e.g. she/her, he/him, they/them"
            className={`${fieldClass} mt-1.5`}
          />
        </div>
      </div>

      <div>
        <label className="fu-label text-sm text-[var(--fu-text-muted)]">Appearance</label>
        <textarea
          value={draft.appearance}
          onChange={(e) => dispatch({ type: "SET_APPEARANCE", value: e.target.value })}
          placeholder="What do they look like? Clothing, build, distinguishing features…"
          rows={5}
          className={`${fieldClass} mt-1.5 resize-none`}
        />
      </div>
    </div>
  );
}
