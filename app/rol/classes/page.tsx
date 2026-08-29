"use client";

import * as React from "react";
import { Accordion } from "@/components/ui/Accordion";
import { SkillText } from "@/components/rol/character/SkillText";
import { ReferenceDataProvider, useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import type { FUClass, FUSubsystem } from "@/app/FU/data/types";

function ClassImage({ classId, name }: { classId: string; name: string }) {
  const [errored, setErrored] = React.useState(false);

  if (errored) {
    return (
      <div className="flex h-40 w-full shrink-0 items-center justify-center border border-border bg-parchment-dark/10 sm:h-auto sm:w-48">
        <span className="px-3 text-center font-body text-xs italic text-ink-light">Todavía sin imagen</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static reference asset (public/images/classes), not a user upload
    <img
      src={`/images/classes/${classId}.webp`}
      alt={name}
      onError={() => setErrored(true)}
      className="h-40 w-full shrink-0 border border-border object-cover object-top sm:h-auto sm:w-48"
    />
  );
}

function SkillsList({ skills }: { skills: FUClass["skills"] }) {
  return (
    <div className="space-y-1.5">
      {skills.map((s) => (
        <div key={s.name} className="rounded-sm border border-border px-2.5 py-2">
          <span className="font-body text-sm font-semibold text-ink">
            {s.name} {s.maxLevel > 1 && <span className="font-label text-2xs text-moss">(◇{s.maxLevel})</span>}
          </span>
          <SkillText text={s.text} className="mt-0.5 text-xs leading-snug text-ink-light font-body" />
        </div>
      ))}
    </div>
  );
}

function SubsystemSection({ subsystem }: { subsystem: FUSubsystem }) {
  if (subsystem.type === "spells") {
    return (
      <>
        <h3 className="font-label mt-4 mb-1.5 text-xs font-bold uppercase tracking-widest text-brass">Hechizos</h3>
        <div className="space-y-1.5">
          {subsystem.entries.map((sp) => (
            <div key={sp.name} className="rounded-sm border border-border px-2.5 py-2">
              <span className="font-body text-sm font-semibold text-ink">
                {sp.name} <span className="font-label text-2xs text-moss">{sp.mpCost} PM · {sp.target}</span>
              </span>
              <SkillText text={sp.text} className="mt-0.5 text-xs leading-snug text-ink-light font-body" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (subsystem.type === "arcana") {
    return (
      <>
        <h3 className="font-label mt-4 mb-1.5 text-xs font-bold uppercase tracking-widest text-brass">Arcana</h3>
        <div className="space-y-1.5">
          {subsystem.entries.map((a) => (
            <div key={a.name} className="rounded-sm border border-border px-2.5 py-2">
              <span className="font-body text-sm font-semibold text-ink">{a.name} <span className="font-label text-2xs text-moss">{a.domains.join(", ")}</span></span>
              <p className="mt-0.5 text-xs leading-snug text-ink-light font-body"><strong className="text-ink">Fusión:</strong> {a.mergeText}</p>
              <p className="mt-0.5 text-xs leading-snug text-ink-light font-body"><strong className="text-ink">Descarte:</strong> {a.dismissText}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  // "inventions" — each invention type has its own basic/advanced/superior tiers
  return (
    <>
      <h3 className="font-label mt-4 mb-1.5 text-xs font-bold uppercase tracking-widest text-brass">Inventos</h3>
      <div className="space-y-3">
        {subsystem.entries.map((inv) => (
          <div key={inv.id} className="rounded-sm border border-border px-2.5 py-2">
            <span className="font-body text-sm font-semibold text-ink">{inv.name}</span>
            <p className="mt-0.5 text-xs leading-snug text-ink-light font-body">{inv.description}</p>
            <div className="mt-1.5 space-y-1">
              {inv.tiers.map((t, i) => (
                <p key={i} className="text-xs leading-snug text-ink-light font-body">
                  <span className="font-label text-2xs uppercase tracking-wide text-moss">{t.name ?? t.tier}{t.ipCost != null ? ` · ${t.ipCost} PI` : ""}:</span>{" "}
                  {t.text}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ClassPanel({ cls }: { cls: FUClass }) {
  return (
    <Accordion
      title={cls.name}
      summary={cls.alsoKnownAs.length > 0 ? `También conocido como: ${cls.alsoKnownAs.join(", ")}` : undefined}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <ClassImage classId={cls.id} name={cls.name} />
        <div className="min-w-0 flex-1">
          <p className="font-body text-sm leading-relaxed text-ink-light">{cls.description}</p>

          <h3 className="font-label mt-4 mb-1.5 text-xs font-bold uppercase tracking-widest text-brass">Habilidades</h3>
          <SkillsList skills={cls.skills} />

          {cls.subsystem && <SubsystemSection subsystem={cls.subsystem} />}
        </div>
      </div>
    </Accordion>
  );
}

function ClassesList() {
  const ref = useReferenceDataContext();
  return (
    <div className="flex max-w-4xl flex-col gap-3">
      {ref.classes.map((cls) => (
        <ClassPanel key={cls.id} cls={cls} />
      ))}
    </div>
  );
}

export default function RolClassesPage() {
  return (
    <main className="px-6 py-14">
      <h1 className="font-display text-3xl text-parchment mb-2">Clases</h1>
      <p className="font-body text-sm text-parchment-dark mb-8">Las 15 clases de Fabula Ultima — descripción, habilidades y, si corresponde, su subsistema (hechizos, arcana o inventos).</p>
      <ReferenceDataProvider>
        <ClassesList />
      </ReferenceDataProvider>
    </main>
  );
}
