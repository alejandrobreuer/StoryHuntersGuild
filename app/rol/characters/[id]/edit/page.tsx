"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { WizardProvider, useWizard } from "@/app/FU/lib/wizardState";
import { WizardShell } from "@/components/rol/character/WizardShell";
import { Step1Identity } from "@/components/rol/character/steps/Step1Identity";
import { Step2Theme } from "@/components/rol/character/steps/Step2Theme";
import { Step3Origin } from "@/components/rol/character/steps/Step3Origin";
import { Step8Finishing } from "@/components/rol/character/steps/Step8Finishing";
import { emptyDraft, type FUCharacter, type FUDraft } from "@/app/FU/lib/types";
import { toast } from "sonner";

// Editing an existing character only covers the "concept" fields the rules
// let you freely revise (Identity/Theme can even change on level-up) — not
// Clases/Atributos/Equipo, which the wizard's "distribute exactly 5 starting
// levels off a fixed budget" model can't represent for a character that's
// already been played (leveled up, gained items/Bonds/Heroic Skills, spent
// XP...). Those stay editable on the sheet itself instead (Sumar clase,
// Inventario). See character-sheet-logic-spec discussion — narrowed scope
// deliberately to avoid corrupting play progress.
const STEPS = [Step1Identity, Step2Theme, Step3Origin, Step8Finishing];
const STEP_TITLES = ["Identidad", "Tema", "Origen", "Toques finales"];

interface CharacterRow {
  id: string;
  name: string;
  sheet_data: FUCharacter;
  portrait_url: string | null;
  full_body_url: string | null;
}

function clampStep(n: number): number {
  return Math.min(Math.max(n, 0), STEPS.length - 1);
}

function EditWizardInner({ characterId, original }: { characterId: string; original: CharacterRow }) {
  const router = useRouter();
  const { draft } = useWizard();
  const [step, setStep] = React.useState(0);
  const [furthestStep, setFurthestStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  function goToStep(next: number) {
    const clamped = clampStep(next);
    setStep(clamped);
    setFurthestStep((f) => Math.max(f, clamped));
  }

  const missing: string[] = [];
  if (!draft.identity.trim()) missing.push("Identidad");
  if (!draft.theme.trim()) missing.push("Tema");
  if (!draft.origin.trim()) missing.push("Origen");
  if (!draft.name.trim()) missing.push("Nombre");
  const canFinish = missing.length === 0;

  async function handleFinish() {
    if (!canFinish || saving) return;
    setSaving(true);
    try {
      // Only the concept fields come from the draft — everything else (level,
      // xp, classLevels, attributes, equipment, backpack, bonds, heroicSkills,
      // currentHp/Mp/Ip, zenit, otherItemsNote...) stays exactly as it was.
      const sheet_data: FUCharacter = {
        ...original.sheet_data,
        identity: draft.identity,
        theme: draft.theme,
        origin: draft.origin,
        name: draft.name,
        pronouns: draft.pronouns,
        appearance: draft.appearance,
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch(`/api/rol/characters/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sheet_data.name,
          sheet_data,
          portrait_url: original.portrait_url,
          full_body_url: original.full_body_url,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo guardar."); return; }
      router.push(`/rol/characters/${characterId}`);
    } finally {
      setSaving(false);
    }
  }

  const StepComponent = STEPS[step];

  return (
    <>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-6 md:px-8">
        <Link href={`/rol/characters/${characterId}`} className="font-label text-xs uppercase tracking-widest text-parchment-dark hover:text-parchment">
          ← Volver al personaje
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
        stepTitles={STEP_TITLES}
        finishLabel="Guardar cambios"
      >
        <StepComponent />
      </WizardShell>
    </>
  );
}

export default function EditCharacterPage() {
  const params = useParams<{ id: string }>();
  const [character, setCharacter] = React.useState<CharacterRow | null | undefined>(undefined);

  React.useEffect(() => {
    fetch(`/api/rol/characters/${params.id}`)
      .then(async (r) => {
        const json = await r.json();
        setCharacter(r.ok ? json.data : null);
      })
      .catch(() => setCharacter(null));
  }, [params.id]);

  if (character === undefined) return null;
  if (character === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-display text-2xl text-parchment">Personaje no encontrado.</p>
      </div>
    );
  }

  const initialDraft: FUDraft = {
    ...emptyDraft(),
    identity: character.sheet_data.identity,
    theme: character.sheet_data.theme,
    origin: character.sheet_data.origin,
    name: character.sheet_data.name,
    pronouns: character.sheet_data.pronouns,
    appearance: character.sheet_data.appearance,
  };

  return (
    <WizardProvider initialDraft={initialDraft}>
      <EditWizardInner characterId={character.id} original={character} />
    </WizardProvider>
  );
}
