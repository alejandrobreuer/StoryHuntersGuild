import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  RULES_BUCKET, MAX_RULES_PDF_BYTES, rulesObjectPath, getRulesPdfUrl, hasStaticRulesPdf,
} from "@/lib/rules-pdf";

// ─── /api/admin/games/[id]/rules-pdf ────────────────────────────────────────
// GET    → { url } to view the game's rulebook PDF (404 if none).
// POST   → a one-time signed upload URL. The browser uploads the file
//          straight to Supabase Storage with it, because rulebooks are often
//          bigger than the ~4.5 MB request body limit of serverless routes.
// DELETE → removes the uploaded PDF from Storage.

export const runtime = "nodejs";

async function gameExists(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("shg_games").select("id").eq("id", id).maybeSingle();
  return Boolean(data);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("games");
  if (error) return error;

  const url = await getRulesPdfUrl(params.id);
  if (!url) return NextResponse.json({ error: "Este juego no tiene PDF de reglas." }, { status: 404 });
  return NextResponse.json({ data: { url } });
}

const postSchema = z.object({
  size: z.number().int().positive(),
  type: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("games");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
  if (parsed.data.type !== "application/pdf") {
    return NextResponse.json({ error: "El reglamento tiene que ser un PDF." }, { status: 422 });
  }
  if (parsed.data.size > MAX_RULES_PDF_BYTES) {
    return NextResponse.json({ error: "El PDF supera los 50 MB." }, { status: 422 });
  }
  if (!(await gameExists(params.id))) return NextResponse.json({ error: "Juego no encontrado." }, { status: 404 });

  const admin = createAdminClient();
  const { data, error: signError } = await admin.storage
    .from(RULES_BUCKET)
    .createSignedUploadUrl(rulesObjectPath(params.id), { upsert: true });
  if (signError || !data) {
    return NextResponse.json({ error: "No se pudo preparar la subida del PDF." }, { status: 500 });
  }

  return NextResponse.json({ data: { bucket: RULES_BUCKET, path: data.path, token: data.token } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("games");
  if (error) return error;

  const admin = createAdminClient();
  const { error: removeError } = await admin.storage.from(RULES_BUCKET).remove([rulesObjectPath(params.id)]);
  if (removeError) return NextResponse.json({ error: "No se pudo quitar el PDF." }, { status: 500 });

  // A bundled public/rules/ file can't be deleted from here — it ships with the code.
  return NextResponse.json({ data: { stillHasStaticPdf: hasStaticRulesPdf(params.id) } });
}
