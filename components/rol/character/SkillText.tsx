import type { ReactNode } from "react";

const BRACKET_RE = /【([^】]*)】/g;

function resolveSkillLevelToken(inner: string, skillLevel?: number): string | null {
  if (skillLevel == null) return null;
  const plain = inner.trim();
  if (plain === "SL") return String(skillLevel);
  const mult = plain.match(/^SL\s*×\s*(\d+)$/);
  if (mult) return String(skillLevel * Number(mult[1]));
  return null;
}

function renderInline(text: string, skillLevel: number | undefined, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(BRACKET_RE);
  let key = 0;
  while ((match = re.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const inner = match[1].trim();
    const resolved = resolveSkillLevelToken(inner, skillLevel);
    parts.push(
      <span key={`${keyPrefix}-${key++}`} className="font-medium text-moss">
        {resolved ?? `【${inner}】`}
      </span>
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/** Ported from app/FU — substitutes 【SL】/【SL × N】 tokens, highlights bracketed formulas. */
export function SkillText({ text, skillLevel, className }: { text: string; skillLevel?: number; className?: string }) {
  const paragraphs = text.split("\n\n");
  return (
    <div className={className}>
      {paragraphs.map((para, i) => (
        <p key={i} className={i > 0 ? "mt-2" : undefined}>
          {renderInline(para, skillLevel, String(i))}
        </p>
      ))}
    </div>
  );
}
