"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export const STEP_TITLES = [
  "Identity",
  "Theme",
  "Origin",
  "Classes",
  "Attributes",
  "Derived Stats",
  "Equipment",
  "Finishing Touches",
];

export function WizardShell({
  step,
  onStepChange,
  furthestStep,
  canFinish,
  finishHint,
  onBack,
  onNext,
  onFinish,
  children,
}: {
  step: number;
  onStepChange: (step: number) => void;
  furthestStep: number;
  canFinish: boolean;
  finishHint?: string;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  children: React.ReactNode;
}) {
  const isLast = step === STEP_TITLES.length - 1;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:px-8">
      <aside className="md:w-64 md:shrink-0">
        <div className="fu-scrollbar flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
          {STEP_TITLES.map((title, i) => {
            const reached = i <= furthestStep;
            const active = i === step;
            return (
              <button
                key={title}
                type="button"
                disabled={!reached}
                onClick={() => reached && onStepChange(i)}
                className={cn(
                  "fu-label flex shrink-0 items-center gap-3 rounded-md px-4 py-3 text-left text-sm transition-colors md:shrink",
                  active && "bg-[var(--fu-panel-hover)] text-[var(--fu-gold-bright)]",
                  !active && reached && "text-[var(--fu-text-onwood-muted)] hover:text-[var(--fu-text-onwood)]",
                  !reached && "text-[var(--fu-text-onwood-muted)]/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm",
                    active && "border-[var(--fu-gold)] text-[var(--fu-gold)]",
                    !active && reached && "border-[var(--fu-text-onwood-muted)] text-[var(--fu-text-onwood-muted)]",
                    !reached && "border-[var(--fu-border-bright)]",
                  )}
                >
                  {i < furthestStep ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className="whitespace-nowrap md:whitespace-normal">{title}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="fu-panel flex-1 p-6 sm:p-8">{children}</div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={step === 0}
            className="fu-label rounded-md px-4 py-2.5 text-sm text-[var(--fu-text-onwood-muted)] transition-colors hover:text-[var(--fu-text-onwood)] disabled:opacity-30"
          >
            ← Back
          </button>
          {isLast ? (
            <div className="flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={onFinish}
                disabled={!canFinish}
                className="fu-label rounded-md bg-[var(--fu-gold-glow)] px-7 py-3 text-sm font-bold text-[var(--fu-bg)] transition-opacity hover:opacity-90 disabled:opacity-30"
              >
                Finish Character
              </button>
              {!canFinish && finishHint && (
                <span className="text-sm text-[var(--fu-gold-glow)]">{finishHint}</span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="fu-label rounded-md bg-[var(--fu-gold-glow)] px-7 py-3 text-sm font-bold text-[var(--fu-bg)] transition-opacity hover:opacity-90"
            >
              Next →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
