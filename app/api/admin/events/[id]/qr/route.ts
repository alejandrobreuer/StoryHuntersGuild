import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadEventQrCodes } from "@/lib/qr/eventCodes";
import { qrSvg } from "@/lib/qr/images";
import { missionClaimUrl, checkinUrl } from "@/lib/qr/tokens";
import { getQrWindowSettings, missionClaimWindow, checkinWindow, QR_SETTING_KEYS } from "@/lib/qr/settings";

// ─── GET /api/admin/events/[id]/qr ──────────────────────────────────────────
// Everything the admin QR tab shows: the check-in code, one code per
// attached mission (created on the spot if missing), the live QR parties
// waiting to be closed, the computed scan windows, and whether a card
// template has been uploaded.

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  const admin = createAdminClient();
  const loaded = await loadEventQrCodes(admin, params.id).catch(() => null);
  if (!loaded) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  const { event, codes } = loaded;

  const groupQuestIds = codes.filter((c) => c.quest.type === "group").map((c) => c.quest.id);

  const [settings, { data: template }, { data: parties }, checkinSvg, codeSvgs] = await Promise.all([
    getQrWindowSettings(admin),
    admin.from("shg_settings").select("value").eq("key", QR_SETTING_KEYS.templatePath).maybeSingle(),
    groupQuestIds.length > 0
      ? admin
          .from("shg_quest_groups")
          .select("id, quest_id, status, source, created_at, members:shg_quest_group_members(user_id, joined_at, user:shg_users(id, email, name))")
          .eq("event_id", params.id)
          .in("quest_id", groupQuestIds)
          .in("status", ["forming", "started"])
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    qrSvg(checkinUrl(event.checkin_token)),
    Promise.all(codes.map((c) => qrSvg(missionClaimUrl(c.token)))),
  ]);

  const claims = missionClaimWindow(event, settings);
  const checkin = checkinWindow(event, settings);

  return NextResponse.json({
    data: {
      event: { id: event.id, title: event.title, slug: event.slug, starts_at: event.starts_at, ends_at: event.ends_at },
      checkin: {
        active: event.checkin_active, url: checkinUrl(event.checkin_token), svg: checkinSvg,
      },
      codes: codes.map((c, i) => ({
        id: c.id, active: c.active, rotated_at: c.rotated_at, url: missionClaimUrl(c.token), svg: codeSvgs[i],
        quest: { id: c.quest.id, title: c.quest.title, type: c.quest.type, difficulty: c.quest.difficulty },
      })),
      parties: parties ?? [],
      windows: {
        claimsOpenAt: claims.opensAt.toISOString(), claimsCloseAt: claims.closesAt.toISOString(),
        checkinOpenAt: checkin.opensAt.toISOString(),
      },
      templateUploaded: Boolean(template?.value),
    },
  });
}
