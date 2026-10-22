import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadEventQrCodes, fileSlug } from "@/lib/qr/eventCodes";
import { fillMissionCards } from "@/lib/qr/cards";
import { QR_SETTING_KEYS } from "@/lib/qr/settings";
import { TEMPLATE_BUCKET } from "@/lib/qr/template";

// ─── GET /api/admin/events/[id]/qr/cards ────────────────────────────────────
// "Imprimir tarjetas": one filled card per active mission code, as a .docx
// ready to print from Word. Stays .docx on purpose — PDF conversion would
// need LibreOffice on the server.

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  const admin = createAdminClient();
  const { data: setting } = await admin
    .from("shg_settings").select("value").eq("key", QR_SETTING_KEYS.templatePath).maybeSingle();
  if (!setting?.value) {
    return NextResponse.json(
      { error: "Todavía no subiste una plantilla de tarjetas. Cargala en Configuración → Códigos QR." },
      { status: 422 }
    );
  }

  const loaded = await loadEventQrCodes(admin, params.id).catch(() => null);
  if (!loaded) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  const codes = loaded.codes.filter((c) => c.active);
  if (codes.length === 0) {
    return NextResponse.json({ error: "Este evento no tiene misiones con código activo." }, { status: 422 });
  }

  const { data: file, error: downloadError } = await admin.storage.from(TEMPLATE_BUCKET).download(setting.value);
  if (downloadError || !file) {
    return NextResponse.json({ error: "No se pudo leer la plantilla. Volvé a subirla." }, { status: 500 });
  }

  let docx: Buffer;
  try {
    docx = await fillMissionCards(Buffer.from(await file.arrayBuffer()), loaded.event, codes);
  } catch {
    return NextResponse.json({ error: "No se pudo completar la plantilla. Revisá sus etiquetas." }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(docx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileSlug(loaded.event.slug)}_tarjetas.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
