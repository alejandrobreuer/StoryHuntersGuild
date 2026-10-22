import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { fileSlug } from "@/lib/qr/eventCodes";
import { qrPng, qrSvg } from "@/lib/qr/images";
import { missionClaimUrl, checkinUrl } from "@/lib/qr/tokens";

// ─── GET /api/admin/events/[id]/qr/download?target=checkin|<codeId>&format=png|svg
// One QR as a file: ~1024 px PNG for print, or SVG. Named
// {event-slug}_{mission-slug}.{ext} (or _check-in for the entrance code).

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  const target = req.nextUrl.searchParams.get("target");
  const format = req.nextUrl.searchParams.get("format") === "svg" ? "svg" : "png";
  if (!target) return NextResponse.json({ error: "Falta el código." }, { status: 422 });

  const admin = createAdminClient();
  const { data: event } = await admin.from("shg_events").select("slug, checkin_token").eq("id", params.id).maybeSingle();
  if (!event) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });

  let url: string;
  let name: string;
  if (target === "checkin") {
    if (!event.checkin_token) return NextResponse.json({ error: "Código no encontrado." }, { status: 404 });
    url = checkinUrl(event.checkin_token);
    name = "check-in";
  } else {
    const { data: code } = await admin
      .from("shg_event_mission_codes").select("token, quest:shg_quests(title)")
      .eq("id", target).eq("event_id", params.id).maybeSingle();
    if (!code) return NextResponse.json({ error: "Código no encontrado." }, { status: 404 });
    const quest = Array.isArray(code.quest) ? code.quest[0] : code.quest;
    url = missionClaimUrl(code.token);
    name = fileSlug((quest as { title: string } | null)?.title ?? "mision");
  }

  const filename = `${fileSlug(event.slug)}_${name}.${format}`;
  const headers = { "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" };

  if (format === "svg") {
    return new NextResponse(await qrSvg(url), { headers: { ...headers, "Content-Type": "image/svg+xml" } });
  }
  return new NextResponse(new Uint8Array(await qrPng(url)), { headers: { ...headers, "Content-Type": "image/png" } });
}
