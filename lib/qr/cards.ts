import JSZip from "jszip";
import { TemplateHandler, MimeType } from "easy-template-x";
import { qrCardPng } from "@/lib/qr/images";
import { missionClaimUrl } from "@/lib/qr/tokens";
import { DIFFICULTY_LABELS } from "@/lib/gamification/questDifficulty";
import { EVENT_TIME_ZONE } from "@/lib/formatting";
import type { EventQrCode, EventQrEvent } from "@/lib/qr/eventCodes";
import type { QuestType } from "@/types/database";

// ─── Printable mission cards ────────────────────────────────────────────────
// Fills the admin-uploaded .docx template (Settings → Códigos QR) with one
// card per mission, the same way Reference/fill-sample.js does — that file
// is the tested reference implementation, and easy-template-x is pinned to
// 8.0.0 because the loop behaviour below is version-specific:
// - the QR is a placeholder image whose alt text is {qr_code}; the library
//   swaps it and keeps its size, so we only pass the PNG;
// - each card is a table row + spacer row with {#missions} in the card's
//   left cell and {/missions} in the spacer's right cell (same column would
//   repeat columns instead of rows);
// - event_name / event_date are top-level and resolve inside the loop.

/** Tags a template must contain to be accepted on upload. */
export const REQUIRED_TEMPLATE_TAGS = ["mission_title", "qr_code"] as const;

/** Card height is fixed (the parchment background has to fit), so longer
 * descriptions get cut off at the bottom of the printed card. */
const MAX_DESCRIPTION_CHARS = 180;

const TYPE_LABELS: Record<QuestType, string> = {
  individual: "Individual", group: "Grupo", event: "Evento", guild: "Gremio",
};

/** Returns the required tags the template is missing (empty = OK). Throws if
 * the file isn't a readable .docx. */
export async function missingTemplateTags(template: Buffer): Promise<string[]> {
  const tags = await new TemplateHandler().parseTags(template);
  const names = new Set(tags.map((t) => t.name));
  return REQUIRED_TEMPLATE_TAGS.filter((t) => !names.has(t));
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function cardDate(iso: string): string {
  const s = new Date(iso).toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: EVENT_TIME_ZONE,
  }).replace(/\./g, "").replace(/,/g, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function fillMissionCards(template: Buffer, event: EventQrEvent, codes: EventQrCode[]): Promise<Buffer> {
  const missions = await Promise.all(codes.map(async (c) => {
    const url = missionClaimUrl(c.token);
    return {
      mission_title:       c.quest.title,
      mission_description: truncate(c.quest.narrative ?? "", MAX_DESCRIPTION_CHARS),
      mission_type:        TYPE_LABELS[c.quest.type],
      difficulty:          DIFFICULTY_LABELS[c.quest.difficulty],
      game:                c.quest.game?.name ?? "",
      mission_url:         url,
      qr_code:             { _type: "image" as const, source: await qrCardPng(url), format: MimeType.Png },
    };
  }));

  const filled = await new TemplateHandler().process(template, {
    event_name: event.title,
    event_date: cardDate(event.starts_at),
    missions,
  });

  // Copied cards repeat the background image's drawing id; give every
  // drawing a unique id so Word never flags the file as damaged.
  const zip = await JSZip.loadAsync(filled);
  const docFile = zip.file("word/document.xml");
  if (docFile) {
    let xml = await docFile.async("string");
    let next = 1;
    xml = xml.replace(/<wp:docPr id="\d+"/g, () => `<wp:docPr id="${next++}"`);
    zip.file("word/document.xml", xml);
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
