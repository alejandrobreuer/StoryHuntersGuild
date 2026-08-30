"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SkillText } from "@/components/rol/character/SkillText";
import { ReferenceDataProvider, useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import type { FUClass, FUSubsystem } from "@/app/FU/data/types";

function SubsystemSection({ subsystem }: { subsystem: FUSubsystem }) {
  if (subsystem.type === "spells") {
    return (
      <>
        <h2 className="mb-3 mt-8 font-label text-sm font-bold uppercase tracking-widest text-brass-bright">Hechizos</h2>
        <div className="space-y-2">
          {subsystem.entries.map((sp) => (
            <div key={sp.name} className="rounded-sm border border-brass/20 bg-black/30 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-base text-parchment">{sp.name}</span>
                <span className="shrink-0 font-label text-2xs text-moss-light">{sp.mpCost} PM · {sp.target}</span>
              </div>
              <SkillText text={sp.text} className="mt-1 font-body text-xs leading-relaxed text-parchment-dark" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (subsystem.type === "arcana") {
    return (
      <>
        <h2 className="mb-3 mt-8 font-label text-sm font-bold uppercase tracking-widest text-brass-bright">Arcana</h2>
        <div className="space-y-2">
          {subsystem.entries.map((a) => (
            <div key={a.name} className="rounded-sm border border-brass/20 bg-black/30 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-base text-parchment">{a.name}</span>
                <span className="shrink-0 font-label text-2xs text-moss-light">{a.domains.join(", ")}</span>
              </div>
              <p className="mt-1 font-body text-xs leading-relaxed text-parchment-dark"><strong className="text-parchment">Fusión:</strong> {a.mergeText}</p>
              <p className="mt-1 font-body text-xs leading-relaxed text-parchment-dark"><strong className="text-parchment">Descarte:</strong> {a.dismissText}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  // "inventions" — each invention type has its own basic/advanced/superior tiers
  return (
    <>
      <h2 className="mb-3 mt-8 font-label text-sm font-bold uppercase tracking-widest text-brass-bright">Inventos</h2>
      <div className="space-y-3">
        {subsystem.entries.map((inv) => (
          <div key={inv.id} className="rounded-sm border border-brass/20 bg-black/30 px-3 py-2.5">
            <span className="font-display text-base text-parchment">{inv.name}</span>
            <p className="mt-1 font-body text-xs leading-relaxed text-parchment-dark">{inv.description}</p>
            <div className="mt-1.5 space-y-1">
              {inv.tiers.map((t, i) => (
                <p key={i} className="font-body text-xs leading-relaxed text-parchment-dark">
                  <span className="font-label text-2xs uppercase tracking-wide text-moss-light">
                    {t.name ?? t.tier}{t.ipCost != null ? ` · ${t.ipCost} PI` : ""}:
                  </span>{" "}
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

function ClassDetail({ cls }: { cls: FUClass }) {
  const ref = useReferenceDataContext();
  const [bgError, setBgError] = React.useState(false);
  const [charError, setCharError] = React.useState(false);
  const heroicSkills = ref.heroicSkills.filter(
    (h) => h.requirement && h.requirement.toLowerCase().includes(cls.name.toLowerCase())
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      {bgError ? (
        <div className="absolute inset-0 bg-gradient-to-br from-[#3a2a1c] to-[#5c3d24]" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- static reference asset (public/images/classes/backgrounds)
        <img
          src={`/images/classes/backgrounds/${cls.id}.webp`}
          alt=""
          onError={() => setBgError(true)}
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[2px]"
        />
      )}
      <div className="absolute inset-0 bg-black/70" />

      <Link
        href="/rol/classes"
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-parchment-dark transition-colors hover:text-brass-bright"
      >
        <ArrowLeft size={14} /> Clases
      </Link>

      <div className="relative z-10 flex h-full flex-col md:flex-row">
        {!charError && (
          <div className="relative hidden shrink-0 md:block md:w-[38%]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static reference asset (public/images/classes) */}
            <img
              src={`/images/classes/${cls.id}.webp`}
              alt={cls.name}
              onError={() => setCharError(true)}
              className="absolute inset-0 h-full w-full object-contain object-bottom drop-shadow-2xl"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-16 md:px-10 md:py-20">
          <h1 className="font-display text-4xl uppercase tracking-wide text-brass-bright">{cls.name}</h1>
          {cls.alsoKnownAs.length > 0 && (
            <p className="mt-1.5 font-label text-xs uppercase tracking-wide text-parchment-dark">
              También conocido como: {cls.alsoKnownAs.join(", ")}
            </p>
          )}
          <p className="mt-4 max-w-2xl font-body text-sm leading-relaxed text-parchment-dark">{cls.description}</p>

          <div className="max-w-2xl">
            <h2 className="mb-3 mt-8 font-label text-sm font-bold uppercase tracking-widest text-brass-bright">Habilidades</h2>
            <div className="space-y-2">
              {cls.skills.map((s) => (
                <div key={s.name} className="rounded-sm border border-brass/20 bg-black/30 px-3 py-2.5">
                  <span className="font-display text-base text-parchment">
                    {s.name} {s.maxLevel > 1 && <span className="font-label text-2xs text-moss-light">(◇{s.maxLevel})</span>}
                  </span>
                  <SkillText text={s.text} className="mt-1 font-body text-xs leading-relaxed text-parchment-dark" />
                </div>
              ))}
            </div>

            {cls.subsystem && <SubsystemSection subsystem={cls.subsystem} />}

            {heroicSkills.length > 0 && (
              <>
                <h2 className="mb-3 mt-8 font-label text-sm font-bold uppercase tracking-widest text-brass-bright">Habilidades Heroicas</h2>
                <div className="space-y-2">
                  {heroicSkills.map((h) => (
                    <div key={h.id} className="rounded-sm border border-crimson/30 bg-black/30 px-3 py-2.5">
                      <span className="font-display text-base text-parchment">{h.name}</span>
                      <p className="mt-1 font-body text-xs leading-relaxed text-parchment-dark">{h.description}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassDetailLoader() {
  const params = useParams<{ id: string }>();
  const ref = useReferenceDataContext();
  const cls = ref.classesById[params.id];

  if (!cls) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-body text-sm italic text-parchment-dark">Clase no encontrada.</p>
      </div>
    );
  }
  return <ClassDetail cls={cls} />;
}

export default function RolClassDetailPage() {
  return (
    <main className="h-[calc(100vh-60px)] bg-[#14100c]">
      <ReferenceDataProvider>
        <ClassDetailLoader />
      </ReferenceDataProvider>
    </main>
  );
}
