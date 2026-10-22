import { createAdminClient } from "@/lib/supabase/admin";

// Global QR window settings (admin Settings → "Códigos QR"). Every window is
// computed here, server-side, from the event's *scheduled* starts_at/ends_at
// — deliberately independent of the admin Start/End buttons, so a host who
// forgets to click Start doesn't lock players out of their scans.

export const QR_SETTING_KEYS = {
  claimsOpenBefore:  "qr_claims_open_before_minutes",
  claimsCloseAfter:  "qr_claims_close_after_minutes",
  checkinOpenBefore: "qr_checkin_open_before_minutes",
  templatePath:      "mission_card_template_path",
  templateName:      "mission_card_template_name",
} as const;

export const QR_SETTING_DEFAULTS = {
  claimsOpenBefore:  0,
  claimsCloseAfter:  60,
  checkinOpenBefore: 60,
};

/** Events with no scheduled end are treated as running this long. */
const FALLBACK_EVENT_LENGTH_HOURS = 12;

export interface QrWindowSettings {
  claimsOpenBefore:  number;
  claimsCloseAfter:  number;
  checkinOpenBefore: number;
}

function minutes(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export async function getQrWindowSettings(
  admin: ReturnType<typeof createAdminClient>
): Promise<QrWindowSettings> {
  const { data } = await admin
    .from("shg_settings")
    .select("key, value")
    .in("key", [QR_SETTING_KEYS.claimsOpenBefore, QR_SETTING_KEYS.claimsCloseAfter, QR_SETTING_KEYS.checkinOpenBefore]);
  const byKey = new Map((data ?? []).map((r) => [r.key as string, r.value as string]));
  return {
    claimsOpenBefore:  minutes(byKey.get(QR_SETTING_KEYS.claimsOpenBefore), QR_SETTING_DEFAULTS.claimsOpenBefore),
    claimsCloseAfter:  minutes(byKey.get(QR_SETTING_KEYS.claimsCloseAfter), QR_SETTING_DEFAULTS.claimsCloseAfter),
    checkinOpenBefore: minutes(byKey.get(QR_SETTING_KEYS.checkinOpenBefore), QR_SETTING_DEFAULTS.checkinOpenBefore),
  };
}

export interface QrWindow { opensAt: Date; closesAt: Date; }
export type QrWindowState = "before" | "open" | "after";

interface ScheduledEvent { starts_at: string; ends_at: string | null; }

function scheduledEnd(event: ScheduledEvent): Date {
  if (event.ends_at) return new Date(event.ends_at);
  return new Date(new Date(event.starts_at).getTime() + FALLBACK_EVENT_LENGTH_HOURS * 3_600_000);
}

/** Mission claims: start − open-before … end + buffer. */
export function missionClaimWindow(event: ScheduledEvent, s: QrWindowSettings): QrWindow {
  return {
    opensAt:  new Date(new Date(event.starts_at).getTime() - s.claimsOpenBefore * 60_000),
    closesAt: new Date(scheduledEnd(event).getTime() + s.claimsCloseAfter * 60_000),
  };
}

/** Check-in opens earlier (players arrive early) but closes with mission claims. */
export function checkinWindow(event: ScheduledEvent, s: QrWindowSettings): QrWindow {
  return {
    opensAt:  new Date(new Date(event.starts_at).getTime() - s.checkinOpenBefore * 60_000),
    closesAt: missionClaimWindow(event, s).closesAt,
  };
}

export function windowState(w: QrWindow, now = new Date()): QrWindowState {
  if (now < w.opensAt) return "before";
  if (now > w.closesAt) return "after";
  return "open";
}
