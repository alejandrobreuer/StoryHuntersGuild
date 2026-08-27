"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// The header always shows what's inside even collapsed (a summary, never
// just a bare label) — per character-sheet-logic-spec.md's "cockpit +
// accordions" design: multiple cards can be open at once, this is not a tab
// switcher.
export function Accordion({
  title, summary, defaultOpen = false, children,
}: {
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className="surface-parchment">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          {summary && <p className="font-body text-xs text-ink-light mt-0.5">{summary}</p>}
        </div>
        {open ? <ChevronUp size={18} className="text-leather-light shrink-0" /> : <ChevronDown size={18} className="text-leather-light shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 sm:px-6 sm:pb-6">{children}</div>}
    </section>
  );
}
