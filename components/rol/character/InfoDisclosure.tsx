"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

/** Inline "why this matters" affordance — ported from app/FU, restyled to the site theme. */
export function InfoDisclosure({ label = "Más info", children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-expanded={open}
        className="ml-1.5 inline-flex h-5 w-5 -translate-y-px items-center justify-center rounded-full text-moss-light transition-colors hover:text-moss"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <div className="surface-parchment absolute left-0 top-7 z-30 max-h-80 w-80 overflow-y-auto p-4 text-sm leading-relaxed text-ink-light shadow-parchment-lg font-body">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute right-2.5 top-2.5 text-leather-light hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="pr-4">{children}</div>
        </div>
      )}
    </div>
  );
}
