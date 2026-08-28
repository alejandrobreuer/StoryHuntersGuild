"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { WizardProvider, isClassStepValid, useWizard } from "@/app/FU/lib/wizardState";
import { WizardShell } from "@/components/rol/character/WizardShell";
import { Step1Identity } from "@/components/rol/character/steps/Step1Identity";
import { Step2Theme } from "@/components/rol/character/steps/Step2Theme";
import { Step3Origin } from "@/components/rol/character/steps/Step3Origin";
import { Step4Classes } from "@/components/rol/character/steps/Step4Classes";
import { Step5Attributes } from "@/components/rol/character/steps/Step5Attributes";
import { Step6DerivedStats } from "@/components/rol/character/steps/Step6DerivedStats";
import { Step7Equipment } from "@/components/rol/character/steps/Step7Equipment";
import { Step8Finishing } from "@/components/rol/character/steps/Step8Finishing";
import { calcSpent, calcHP, calcMP, calcIP } from "@/app/FU/lib/derivedStats";
import { ReferenceDataProvider, useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import { CHARACTER_LEVEL, STARTING_BUDGET, STARTING_FABULA_POINTS, type FUCharacter } from "@/app/FU/lib/types";
import { toast } from "sonner";

const STEPS = [Step1Identity, Step2Theme, Step3Origin, Step4Classes, Step5Attributes, Step6DerivedStats, Step7Equipment, Step8Finishing];

function clampStep(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(Math.trunc(n), 0), STEPS.length - 1);
}

function WizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft } = useWizard();
  const ref = useReferenceDataContext();

  const [step, setStep] = useState(() => clampStep(Number(searchParams.get("step"))));
  const [furthestStep, setFurthestStep] = useState(step);
  const [saving, setSaving] = useState(false);

  function goToStep(next: number) {
    const clamped = clampStep(next);
    setStep(clamped);
    setFurthestStep((f) => Math.max(f, clamped));
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(clamped));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const missing: string[] = [];
  if (!draft.identity.trim()) missing.push("Identidad");
  if (!draft.theme.trim()) missing.push("Tema");
  if (!draft.origin.trim()) missing.push("Origen");
  if (!isClassStepValid(draft)) missing.push("Clases (2–3 clases, 5 niveles)");
  if (!draft.name.trim()) missing.push("Nombre");
  const canFinish = missing.length === 0;

  async function handleFinish() {
    if (!canFinish || saving) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const leftover = Math.max(0, STARTING_BUDGET - calcSpent(draft.equipment, ref));
      const classLevels = draft.classLevels.filter((cl) => cl.levels > 0);
      const classes = classLevels.map((cl) => ref.classesById[cl.classId]).filter((c): c is NonNullable<typeof c> => Boolean(c));
      const sheet_data: Omit<FUCharacter, "id" | "createdAt" | "updatedAt"> = {
        level: CHARACTER_LEVEL,
        identity: draft.identity,
        theme: draft.theme,
        origin: draft.origin,
        trait: "",
        quirks: "",
        classLevels,
        attributes: draft.attributes,
        statusEffects: [],
        heroicSkills: [],
        bonds: [],
        equipment: draft.equipment,
        backpack: [],
        zenit: leftover + (draft.savingsRoll ?? 0),
        name: draft.name,
        pronouns: draft.pronouns,
        appearance: draft.appearance,
        fabulaPoints: STARTING_FABULA_POINTS,
        currentHp: calcHP(CHARACTER_LEVEL, draft.attributes.might, classes).value,
        currentMp: calcMP(CHARACTER_LEVEL, draft.attributes.willpower, classes).value,
        currentIp: calcIP(classes).value,
        xp: 0,
        elementalAffinities: {},
      };

      const res = await fetch("/api/rol/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, sheet_data }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo crear el personaje."); return; }
      router.push(`/rol/characters/${json.data.id}`);
    } finally {
      setSaving(false);
    }
  }

  const StepComponent = STEPS[step];

  return (
    <>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-6 md:px-8">
        <Link href="/rol/characters" className="font-label text-xs uppercase tracking-widest text-parchment-dark hover:text-parchment">
          ← Mis personajes
        </Link>
      </div>
      <WizardShell
        step={step}
        onStepChange={goToStep}
        furthestStep={furthestStep}
        canFinish={canFinish && !saving}
        finishHint={!canFinish ? `Todavía falta: ${missing.join(", ")}` : undefined}
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
      <ReferenceDataProvider>
        <WizardProvider>
          <WizardInner />
        </WizardProvider>
      </ReferenceDataProvider>
    </Suspense>
  );
}
