"use client";

import { Dices } from "lucide-react";
import { useWizard } from "../../../lib/wizardState";
import { identityTables } from "../../../data/tables";
import { InfoDisclosure } from "../../shared/InfoDisclosure";

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
        <h2 className="fu-heading text-3xl font-bold text-[var(--fu-gold-bright)]">Identity</h2>
        <p className="mt-2 flex items-start text-base text-[var(--fu-text-muted)]">
          A short sentence that briefly summarizes how your character sees themselves right now.
          <InfoDisclosure label="Why Identity matters">
            You can invoke your Identity to give yourself an edge when making Checks — pick
            something that will prove useful in play. Good identities read like{" "}
            <em>&quot;Royal Knight&quot;</em> or <em>&quot;Elderly Amnesiac Sorcerer&quot;</em>:
            punchy, evocative, and open to change later as your character grows into someone
            different.
          </InfoDisclosure>
        </p>
      </header>

      <textarea
        value={draft.identity}
        onChange={(e) => dispatch({ type: "SET_IDENTITY", value: e.target.value })}
        placeholder="e.g. Elderly Amnesiac Sorcerer"
        rows={2}
        className="w-full max-w-2xl resize-none rounded-md border border-[var(--fu-border)] bg-[var(--fu-bg-elevated)] p-4 text-lg text-[var(--fu-text)] placeholder:text-[var(--fu-text-muted)]/50 focus:border-[var(--fu-gold)] focus:outline-none"
      />

      <div>
        <button
          type="button"
          onClick={() => dispatch({ type: "SET_IDENTITY", value: rollIdentity() })}
          className="fu-label inline-flex items-center gap-2 rounded-md border border-[var(--fu-cyan-dim)] px-4 py-2.5 text-sm text-[var(--fu-cyan)] transition-colors hover:bg-[var(--fu-cyan)]/10"
        >
          <Dices className="h-4 w-4" /> Roll for me
        </button>
        <p className="mt-2 text-sm text-[var(--fu-text-muted)]">
          Assembled from the Core Concept / Adjective / Detail tables — edit freely once rolled.
        </p>
      </div>
    </div>
  );
}
