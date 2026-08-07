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
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:px-8">
      <aside className="md:w-56 md:shrink-0">
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
                  "fu-label flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-[11px] transition-colors md:shrink",
                  active && "bg-[var(--fu-panel-hover)] text-[var(--fu-gold-bright)]",
                  !active && reached && "text-[var(--fu-text-muted)] hover:text-[var(--fu-text)]",
                  !reached && "text-[var(--fu-border-bright)]",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                    active && "border-[var(--fu-gold)] text-[var(--fu-gold)]",
                    !active && reached && "border-[var(--fu-cyan-dim)] text-[var(--fu-cyan-dim)]",
                    !reached && "border-[var(--fu-border)]",
                  )}
                >
                  {i < furthestStep ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="whitespace-nowrap md:whitespace-normal">{title}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1">{children}</div>

        <div className="mt-8 flex items-center justify-between border-t border-[var(--fu-border)] pt-4">
          <button
            type="button"
            onClick={onBack}
            disabled={step === 0}
            className="fu-label rounded-md px-4 py-2 text-xs text-[var(--fu-text-muted)] transition-colors hover:text-[var(--fu-text)] disabled:opacity-30"
          >
            ← Back
          </button>
          {isLast ? (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={onFinish}
                disabled={!canFinish}
                className="fu-label rounded-md bg-[var(--fu-gold)] px-6 py-2 text-xs font-bold text-[var(--fu-bg)] transition-opacity hover:opacity-90 disabled:opacity-30"
              >
                Finish Character
              </button>
              {!canFinish && finishHint && (
                <span className="text-[11px] text-[var(--fu-gold)]">{finishHint}</span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="fu-label rounded-md bg-[var(--fu-gold)] px-6 py-2 text-xs font-bold text-[var(--fu-bg)] transition-opacity hover:opacity-90"
            >
              Next →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
