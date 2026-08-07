"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { classicCharacters } from "../../data/classicCharacters";
import { classesById } from "../../data/classes";
import { useWizard } from "../../lib/wizardState";

export function TemplatePicker() {
  const [open, setOpen] = useState(false);
  const { dispatch } = useWizard();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fu-label rounded-md border border-[var(--fu-gold-glow)]/50 px-4 py-2 text-sm text-[var(--fu-gold-glow)] transition-colors hover:bg-[var(--fu-gold-glow)]/10"
      >
        Start from a template
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="fu-panel fu-scrollbar max-h-[85vh] w-full max-w-5xl overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="fu-heading text-2xl font-bold text-[var(--fu-gold-bright)]">Classic Characters</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-[var(--fu-text-muted)] hover:text-[var(--fu-text)]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-1.5 text-base text-[var(--fu-text-muted)]">
              Pre-fills your Classes and Attributes with a ready-made level-5 archetype — you can
              still edit anything afterward, including Identity/Theme/Origin you&apos;ve already
              written.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classicCharacters.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    dispatch({ type: "LOAD_TEMPLATE", templateId: t.id });
                    setOpen(false);
                  }}
                  className="fu-panel p-4 text-left transition-colors hover:border-[var(--fu-gold)]"
                >
                  <div className="fu-heading text-lg font-semibold text-[var(--fu-text)]">{t.name}</div>
                  <div className="mt-1 text-sm text-[var(--fu-text-muted)]">
                    {t.classLevels
                      .map((cl) => `${classesById[cl.classId]?.name ?? cl.classId} (${cl.levels})`)
                      .join(" · ")}
                  </div>
                  <div className="mt-1 text-sm text-[var(--fu-cyan)]">{t.equipmentSummary}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
