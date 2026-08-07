"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { WizardProvider, isClassStepValid, useWizard } from "../lib/wizardState";
import { WizardShell } from "../components/wizard/WizardShell";
import { TemplatePicker } from "../components/wizard/TemplatePicker";
import { Step1Identity } from "../components/wizard/steps/Step1Identity";
import { Step2Theme } from "../components/wizard/steps/Step2Theme";
import { Step3Origin } from "../components/wizard/steps/Step3Origin";
import { Step4Classes } from "../components/wizard/steps/Step4Classes";
import { Step5Attributes } from "../components/wizard/steps/Step5Attributes";
import { Step6DerivedStats } from "../components/wizard/steps/Step6DerivedStats";
import { Step7Equipment } from "../components/wizard/steps/Step7Equipment";
import { Step8Finishing } from "../components/wizard/steps/Step8Finishing";
import { calcSpent } from "../lib/derivedStats";
import { newCharacterId, saveCharacter } from "../lib/storage";
import { CHARACTER_LEVEL, STARTING_BUDGET, STARTING_FABULA_POINTS, type FUCharacter } from "../lib/types";

const STEPS = [
  Step1Identity,
  Step2Theme,
  Step3Origin,
  Step4Classes,
  Step5Attributes,
  Step6DerivedStats,
  Step7Equipment,
  Step8Finishing,
];

function clampStep(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(Math.trunc(n), 0), STEPS.length - 1);
}

function WizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft } = useWizard();

  const [step, setStep] = useState(() => clampStep(Number(searchParams.get("step"))));
  const [furthestStep, setFurthestStep] = useState(step);

  function goToStep(next: number) {
    const clamped = clampStep(next);
    setStep(clamped);
    setFurthestStep((f) => Math.max(f, clamped));
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(clamped));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const missing: string[] = [];
  if (!draft.identity.trim()) missing.push("Identity");
  if (!draft.theme.trim()) missing.push("Theme");
  if (!draft.origin.trim()) missing.push("Origin");
  if (!isClassStepValid(draft)) missing.push("Classes (2–3 classes, 5 levels)");
  if (!draft.name.trim()) missing.push("Name");
  const canFinish = missing.length === 0;

  function handleFinish() {
    if (!canFinish) return;
    const now = new Date().toISOString();
    const leftover = Math.max(0, STARTING_BUDGET - calcSpent(draft.equipment));
    const character: FUCharacter = {
      id: newCharacterId(),
      createdAt: now,
      updatedAt: now,
      level: CHARACTER_LEVEL,
      identity: draft.identity,
      theme: draft.theme,
      origin: draft.origin,
      classLevels: draft.classLevels.filter((cl) => cl.levels > 0),
      attributes: draft.attributes,
      equipment: draft.equipment,
      zenit: leftover + (draft.savingsRoll ?? 0),
      name: draft.name,
      pronouns: draft.pronouns,
      appearance: draft.appearance,
      fabulaPoints: STARTING_FABULA_POINTS,
    };
    saveCharacter(character);
    router.push(`/FU/character/${character.id}`);
  }

  const StepComponent = STEPS[step];

  return (
    <>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 md:px-8">
        <Link href="/FU" className="fu-label text-[10px] text-[var(--fu-text-muted)] hover:text-[var(--fu-text)]">
          ← Roster
        </Link>
        <TemplatePicker />
      </div>
      <WizardShell
        step={step}
        onStepChange={goToStep}
        furthestStep={furthestStep}
        canFinish={canFinish}
        finishHint={!canFinish ? `Still needed: ${missing.join(", ")}` : undefined}
        onBack={() => goToStep(step - 1)}
        onNext={() => goToStep(step + 1)}
        onFinish={handleFinish}
      >
        <StepComponent />
      </WizardShell>
    </>
  );
}

export default function NewCharacterPage() {
  return (
    <Suspense fallback={null}>
      <WizardProvider>
        <WizardInner />
      </WizardProvider>
    </Suspense>
  );
}
