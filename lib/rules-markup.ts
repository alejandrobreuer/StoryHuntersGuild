// Small custom markup for game rules — deliberately not full Markdown/HTML,
// just enough for clear, skimmable rules: headings, bullets, bold, and
// colored callouts. Parsed into typed blocks and rendered by
// components/games/RulesContent.tsx, which is the single source of truth
// used both for the public rules view and the admin live preview.
//
// Syntax:
//   # Heading
//   ## Subheading
//   - bullet item
//   **bold text**
//   !tip / !warning / !note   followed by text -> colored callout box

export type RuleBlock =
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "callout"; kind: "tip" | "warning" | "note"; text: string };

export function parseRulesMarkup(raw: string): RuleBlock[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: RuleBlock[] = [];
  let bulletBuffer: string[] = [];

  function flushBullets() {
    if (bulletBuffer.length > 0) {
      blocks.push({ type: "bullets", items: bulletBuffer });
      bulletBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "") { flushBullets(); continue; }

    if (line.startsWith("## ")) { flushBullets(); blocks.push({ type: "subheading", text: line.slice(3).trim() }); continue; }
    if (line.startsWith("# "))  { flushBullets(); blocks.push({ type: "heading", text: line.slice(2).trim() }); continue; }
    if (line.startsWith("- ") || line.startsWith("* ")) { bulletBuffer.push(line.slice(2).trim()); continue; }

    const calloutMatch = line.match(/^!(tip|warning|note)\s+(.*)$/i);
    if (calloutMatch) {
      flushBullets();
      blocks.push({ type: "callout", kind: calloutMatch[1].toLowerCase() as "tip" | "warning" | "note", text: calloutMatch[2].trim() });
      continue;
    }

    flushBullets();
    blocks.push({ type: "paragraph", text: line });
  }
  flushBullets();
  return blocks;
}
