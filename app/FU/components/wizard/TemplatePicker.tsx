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
        className="fu-label rounded-md border border-[var(--fu-gold)]/50 px-3 py-1.5 text-[10px] text-[var(--fu-gold)] transition-colors hover:bg-[var(--fu-gold)]/10"
      >
        Start from a template
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="fu-panel fu-scrollbar max-h-[80vh] w-full max-w-2xl overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="fu-heading text-lg font-bold text-[var(--fu-gold-bright)]">Classic Characters</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-[var(--fu-text-muted)] hover:text-[var(--fu-text)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--fu-text-muted)]">
              Pre-fills your Classes and Attributes with a ready-made level-5 archetype — you can
              still edit anything afterward, including Identity/Theme/Origin you&apos;ve already
              written.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {classicCharacters.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    dispatch({ type: "LOAD_TEMPLATE", templateId: t.id });
                    setOpen(false);
                  }}
                  className="fu-panel p-3 text-left transition-colors hover:border-[var(--fu-gold)]"
                >
                  <div className="fu-heading text-sm font-semibold text-[var(--fu-text)]">{t.name}</div>
                  <div className="mt-1 text-[10px] text-[var(--fu-text-muted)]">
                    {t.classLevels
                      .map((cl) => `${classesById[cl.classId]?.name ?? cl.classId} (${cl.levels})`)
                      .join(" · ")}
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--fu-cyan)]">{t.equipmentSummary}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
