import * as React from "react";
import { cn } from "@/lib/utils";
import type { RuleBlock } from "@/lib/rules-markup";

const CALLOUT_STYLES: Record<string, string> = {
  tip:     "bg-moss/10 border-moss/50 text-moss-dark",
  warning: "bg-crimson/10 border-crimson/50 text-crimson",
  note:    "bg-brass/10 border-brass/50 text-ink",
};

const CALLOUT_LABELS: Record<string, string> = { tip: "Consejo", warning: "Atención", note: "Nota" };

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-bold text-ink">{part.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export function RulesContent({ blocks }: { blocks: RuleBlock[] }) {
  if (blocks.length === 0) {
    return <p className="font-body italic text-sm text-ink-light">Sin reglas cargadas todavía.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return <h3 key={i} className="font-display text-lg text-ink mt-2 first:mt-0">{b.text}</h3>;
          case "subheading":
            return <h4 key={i} className="font-label text-sm font-bold uppercase tracking-wide text-leather">{b.text}</h4>;
          case "bullets":
            return (
              <ul key={i} className="list-disc list-outside pl-5 flex flex-col gap-1 font-body text-sm text-ink-light">
                {b.items.map((item, j) => <li key={j}><InlineText text={item} /></li>)}
              </ul>
            );
          case "callout":
            return (
              <div key={i} className={cn("border-l-4 px-3 py-2 text-sm font-body", CALLOUT_STYLES[b.kind])}>
                <span className="font-label text-2xs font-bold uppercase tracking-widest block mb-0.5">{CALLOUT_LABELS[b.kind]}</span>
                <InlineText text={b.text} />
              </div>
            );
          default:
            return <p key={i} className="font-body text-sm text-ink-light leading-relaxed"><InlineText text={b.text} /></p>;
        }
      })}
    </div>
  );
}
