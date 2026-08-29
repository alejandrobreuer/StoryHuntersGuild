"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const STEP_TITLES = [
  "Identidad",
  "Tema",
  "Origen",
  "Clases",
  "Atributos",
  "Estadísticas",
  "Equipo",
  "Toques finales",
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
  stepTitles = STEP_TITLES,
  finishLabel = "Terminar personaje",
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
  /** Defaults to the full 8-step creation flow — pass a shorter list to reuse the shell for a narrower edit flow. */
  stepTitles?: string[];
  finishLabel?: string;
}) {
  const isLast = step === stepTitles.length - 1;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:px-8">
      <aside className="md:w-56 md:shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
          {stepTitles.map((title, i) => {
            const reached = i <= furthestStep;
            const active = i === step;
            return (
              <button
                key={title}
                type="button"
                disabled={!reached}
                onClick={() => reached && onStepChange(i)}
                className={cn(
                  "font-label flex shrink-0 items-center gap-3 rounded-sm px-3.5 py-2.5 text-left text-xs uppercase tracking-wide transition-colors md:shrink",
                  active && "bg-brass/15 text-brass-bright",
                  !active && reached && "text-parchment-dark hover:text-parchment",
                  !reached && "text-parchment-dark/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-2xs normal-case",
                    active && "border-brass text-brass",
                    !active && reached && "border-parchment-dark text-parchment-dark",
                    !reached && "border-parchment-dark/30"
                  )}
                >
                  {i < furthestStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="whitespace-nowrap md:whitespace-normal">{title}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="surface-parchment flex-1 p-6 sm:p-8">{children}</div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={step === 0}
            className="font-label text-xs uppercase tracking-widest text-parchment-dark transition-colors hover:text-parchment disabled:opacity-30"
          >
            ← Atrás
          </button>
          {isLast ? (
            <div className="flex flex-col items-end gap-1.5">
              <Button type="button" onClick={onFinish} disabled={!canFinish}>{finishLabel}</Button>
              {!canFinish && finishHint && <span className="text-xs text-brass-light font-body">{finishHint}</span>}
            </div>
          ) : (
            <Button type="button" onClick={onNext}>Siguiente →</Button>
          )}
        </div>
      </main>
    </div>
  );
}
