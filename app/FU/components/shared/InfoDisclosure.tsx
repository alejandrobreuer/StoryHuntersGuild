"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

/**
 * Inline "why this matters" affordance for fields that need game knowledge —
 * per the brief, every rules-significant field gets one of these rather than
 * just a label.
 */
export function InfoDisclosure({ label = "More info", children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-expanded={open}
        className="ml-1.5 inline-flex h-5 w-5 -translate-y-px items-center justify-center rounded-full text-[var(--fu-cyan-dim)] transition-colors hover:text-[var(--fu-cyan)]"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <div className="fu-panel fu-scrollbar absolute left-0 top-7 z-30 max-h-80 w-80 overflow-y-auto p-4 text-sm leading-relaxed text-[var(--fu-text-muted)] shadow-2xl">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-2.5 top-2.5 text-[var(--fu-text-muted)] hover:text-[var(--fu-text)]"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="pr-4">{children}</div>
        </div>
      )}
    </div>
  );
}
