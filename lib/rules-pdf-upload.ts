import { createBrowserClient } from "@/lib/supabase/browser";

// Client-side half of the rulebook-PDF upload (server half: lib/rules-pdf.ts
// + /api/admin/games/[id]/rules-pdf). Used by Admin → Juegos and Admin → Reglas.

export const MAX_RULES_PDF_BYTES = 50 * 1024 * 1024;

/** Validation message for a picked file, or null if it's OK to upload. */
export function rulesPdfFileError(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf")) return "El reglamento tiene que ser un PDF.";
  if (file.size > MAX_RULES_PDF_BYTES) return "El PDF supera los 50 MB.";
  return null;
}

/** Uploads a rulebook PDF straight to Supabase Storage via a signed URL from our API
 * (the file never passes through a serverless route, so its size limit doesn't apply).
 * Returns an error message, or null on success. */
export async function uploadRulesPdf(gameId: string, file: File): Promise<string | null> {
  const res = await fetch(`/api/admin/games/${gameId}/rules-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ size: file.size, type: "application/pdf" }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return json.error ?? "No se pudo preparar la subida del PDF.";
  const { bucket, path, token } = json.data as { bucket: string; path: string; token: string };
  const { error } = await createBrowserClient().storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, { contentType: "application/pdf", upsert: true });
  return error ? "No se pudo subir el PDF." : null;
}
