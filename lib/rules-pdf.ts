import fs from "node:fs";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";

// Full rulebook PDFs. New uploads go to the private shg-rules bucket as
// {game_id}.pdf (060_shg_rules_pdfs.sql); older ones still live as static
// files in public/rules/{game_id}.pdf. Storage wins when both exist, so
// re-uploading a game's PDF from the admin replaces the bundled one.

export const RULES_BUCKET = "shg-rules";
export const MAX_RULES_PDF_BYTES = 50 * 1024 * 1024;

export function rulesObjectPath(gameId: string): string {
  return `${gameId}.pdf`;
}

const STATIC_RULES_DIR = path.join(process.cwd(), "public", "rules");

export function hasStaticRulesPdf(gameId: string): boolean {
  return fs.existsSync(path.join(STATIC_RULES_DIR, `${gameId}.pdf`));
}

/** Game ids with a PDF in the shg-rules bucket. */
export async function listStoredRulesGameIds(): Promise<Set<string>> {
  const admin = createAdminClient();
  const ids = new Set<string>();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.storage.from(RULES_BUCKET).list("", { limit: pageSize, offset });
    if (error || !data) break;
    for (const obj of data) if (obj.name.endsWith(".pdf")) ids.add(obj.name.slice(0, -4));
    if (data.length < pageSize) break;
  }
  return ids;
}

export async function hasStoredRulesPdf(gameId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(RULES_BUCKET).list("", { search: rulesObjectPath(gameId), limit: 10 });
  return (data ?? []).some((o) => o.name === rulesObjectPath(gameId));
}

/** URL the admin viewer can load: a 1-hour signed Storage URL, or the static file. Null when there's no PDF. */
export async function getRulesPdfUrl(gameId: string): Promise<string | null> {
  if (await hasStoredRulesPdf(gameId)) {
    const admin = createAdminClient();
    const { data } = await admin.storage.from(RULES_BUCKET).createSignedUrl(rulesObjectPath(gameId), 3600);
    if (data?.signedUrl) return data.signedUrl;
  }
  return hasStaticRulesPdf(gameId) ? `/rules/${gameId}.pdf` : null;
}
