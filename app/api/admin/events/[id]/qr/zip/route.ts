import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadEventQrCodes, fileSlug } from "@/lib/qr/eventCodes";
import { qrPng } from "@/lib/qr/images";
import { missionClaimUrl, checkinUrl } from "@/lib/qr/tokens";

// ─── GET /api/admin/events/[id]/qr/zip ──────────────────────────────────────
// Every active mission QR as a print-quality PNG, plus the check-in code.

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  const admin = createAdminClient();
  const loaded = await loadEventQrCodes(admin, params.id).catch(() => null);
  if (!loaded) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  const { event, codes } = loaded;

  const eventSlug = fileSlug(event.slug);
  const zip = new JSZip();
  zip.file(`${eventSlug}_check-in.png`, await qrPng(checkinUrl(event.checkin_token)));

  const used = new Set<string>();
  for (const c of codes.filter((code) => code.active)) {
    let name = `${eventSlug}_${fileSlug(c.quest.title)}`;
    // Two missions with the same title must not overwrite each other.
    for (let n = 2; used.has(name); n++) name = `${eventSlug}_${fileSlug(c.quest.title)}-${n}`;
    used.add(name);
    zip.file(`${name}.png`, await qrPng(missionClaimUrl(c.token)));
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${eventSlug}_qr.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
