"use client";

import { useWizard } from "../../../lib/wizardState";
import { InfoDisclosure } from "../../shared/InfoDisclosure";

export function Step3Origin() {
  const { draft, dispatch } = useWizard();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="fu-heading text-3xl font-bold text-[var(--fu-gold-bright)]">Origin</h2>
        <p className="mt-2 flex items-start text-base text-[var(--fu-text-muted)]">
          The place your character hails from — a village, a great city, or something more
          fantastical.
          <InfoDisclosure label="Why Origin matters">
            Just like Identity and Theme, Origin can be invoked to reroll dice during a Check.
            Unlike them, you&apos;ll normally be unable to change it in play — unless your
            character discovers their memories are fake, which is a fantasy trope too.
          </InfoDisclosure>
        </p>
      </header>

      <textarea
        value={draft.origin}
        onChange={(e) => dispatch({ type: "SET_ORIGIN", value: e.target.value })}
        placeholder="e.g. Platea, a once-peaceful citadel atop a cliff overseeing a vast lake"
        rows={3}
        className="w-full max-w-2xl resize-none rounded-md border border-[var(--fu-border)] bg-[var(--fu-bg-elevated)] p-4 text-lg text-[var(--fu-text)] placeholder:text-[var(--fu-text-muted)]/50 focus:border-[var(--fu-gold)] focus:outline-none"
      />
    </div>
  );
}
