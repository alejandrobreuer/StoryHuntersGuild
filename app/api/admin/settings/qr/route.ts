import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQrWindowSettings, QR_SETTING_KEYS } from "@/lib/qr/settings";
import { qrSettingsSchema } from "@/lib/validation/qr";

// ─── GET/PUT /api/admin/settings/qr ─────────────────────────────────────────
// The scan-window minutes, plus which card template (if any) is uploaded.

export async function GET() {
  const { error } = await requirePermission("settings");
  if (error) return error;

  const admin = createAdminClient();
  const [windows, { data: template }] = await Promise.all([
    getQrWindowSettings(admin),
    admin.from("shg_settings").select("key, value, updated_at")
      .in("key", [QR_SETTING_KEYS.templatePath, QR_SETTING_KEYS.templateName]),
  ]);
  const path = template?.find((r) => r.key === QR_SETTING_KEYS.templatePath);
  const name = template?.find((r) => r.key === QR_SETTING_KEYS.templateName);

  return NextResponse.json({
    data: {
      ...windows,
      template: path?.value ? { name: name?.value || "plantilla.docx", uploadedAt: path.updated_at } : null,
    },
  });
}

export async function PUT(req: NextRequest) {
  const { error } = await requirePermission("settings");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = qrSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { error: upsertError } = await admin.from("shg_settings").upsert([
    { key: QR_SETTING_KEYS.claimsOpenBefore,  value: String(parsed.data.claimsOpenBefore),  updated_at: now },
    { key: QR_SETTING_KEYS.claimsCloseAfter,  value: String(parsed.data.claimsCloseAfter),  updated_at: now },
    { key: QR_SETTING_KEYS.checkinOpenBefore, value: String(parsed.data.checkinOpenBefore), updated_at: now },
  ]);
  if (upsertError) return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
