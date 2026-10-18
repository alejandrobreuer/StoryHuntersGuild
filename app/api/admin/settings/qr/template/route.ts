import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { QR_SETTING_KEYS } from "@/lib/qr/settings";
import { missingTemplateTags } from "@/lib/qr/cards";
import { TEMPLATE_BUCKET, DOCX_MIME, MAX_TEMPLATE_BYTES } from "@/lib/qr/template";

// ─── POST/DELETE /api/admin/settings/qr/template ────────────────────────────
// Upload (or replace) the mission-card .docx template. Rejected — with the
// missing tags listed — unless it has at least {mission_title} and an image
// whose alt text is {qr_code}, so "Imprimir tarjetas" can't fail later on a
// template that was never going to work.

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("settings");
  if (error) return error;

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "La plantilla tiene que ser un archivo .docx de Word." }, { status: 422 });
  }
  if (file.size > MAX_TEMPLATE_BYTES) {
    return NextResponse.json({ error: "El archivo supera los 10 MB." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let missing: string[];
  try {
    missing = await missingTemplateTags(buffer);
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo. ¿Es un .docx válido?" }, { status: 422 });
  }
  if (missing.length > 0) {
    const list = missing.map((t) => (t === "qr_code" ? "{qr_code} (como texto alternativo de una imagen)" : `{${t}}`)).join(", ");
    return NextResponse.json({ error: `A la plantilla le falta: ${list}.` }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: previous } = await admin
    .from("shg_settings").select("value").eq("key", QR_SETTING_KEYS.templatePath).maybeSingle();

  const path = `mission-card-template-${Date.now()}.docx`;
  const { error: uploadError } = await admin.storage
    .from(TEMPLATE_BUCKET)
    .upload(path, buffer, { contentType: DOCX_MIME, upsert: false });
  if (uploadError) return NextResponse.json({ error: "No se pudo subir la plantilla." }, { status: 500 });

  const now = new Date().toISOString();
  const { error: saveError } = await admin.from("shg_settings").upsert([
    { key: QR_SETTING_KEYS.templatePath, value: path, updated_at: now },
    { key: QR_SETTING_KEYS.templateName, value: file.name, updated_at: now },
  ]);
  if (saveError) {
    await admin.storage.from(TEMPLATE_BUCKET).remove([path]);
    return NextResponse.json({ error: "No se pudo guardar la plantilla." }, { status: 500 });
  }

  if (previous?.value) await admin.storage.from(TEMPLATE_BUCKET).remove([previous.value]);

  return NextResponse.json({ data: { name: file.name, uploadedAt: now } });
}

export async function DELETE() {
  const { error } = await requirePermission("settings");
  if (error) return error;

  const admin = createAdminClient();
  const { data: previous } = await admin
    .from("shg_settings").select("value").eq("key", QR_SETTING_KEYS.templatePath).maybeSingle();

  await admin.from("shg_settings").delete().in("key", [QR_SETTING_KEYS.templatePath, QR_SETTING_KEYS.templateName]);
  if (previous?.value) await admin.storage.from(TEMPLATE_BUCKET).remove([previous.value]);

  return NextResponse.json({ ok: true });
}
