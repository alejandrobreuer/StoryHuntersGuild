import { createAdminClient } from "@/lib/supabase/admin";
import { isWellFormedQrToken } from "@/lib/qr/tokens";
import { getQrWindowSettings, checkinWindow, windowState } from "@/lib/qr/settings";
import { recordAttendance } from "@/lib/qr/attendance";

type Admin = ReturnType<typeof createAdminClient>;

// ─── Event check-in QR (/checkin/[token]) ───────────────────────────────────
// Same mechanics as a mission claim: the page only evaluates, the POST
// writes. Scanning it at the entrance is mostly about getting players
// logged in on their phones before the first mission card.

export type CheckinOutcome =
  | { kind: "invalid" }
  | { kind: "inactive" }
  | { kind: "not_open"; eventTitle: string; opensAt: string }
  | { kind: "closed"; eventTitle: string }
  | { kind: "login_required" }
  | { kind: "ready"; eventTitle: string }
  | { kind: "checked_in"; eventTitle: string; eventId: string; alreadyCheckedIn: boolean };

type EventRow = { id: string; title: string; status: string; starts_at: string; ends_at: string | null; checkin_active: boolean };

async function loadEvent(admin: Admin, token: string): Promise<EventRow | CheckinOutcome> {
  if (!isWellFormedQrToken(token)) return { kind: "invalid" };

  const { data: event } = await admin
    .from("shg_events")
    .select("id, title, status, starts_at, ends_at, checkin_active")
    .eq("checkin_token", token)
    .maybeSingle();
  if (!event) return { kind: "invalid" };
  if (!event.checkin_active || event.status !== "published") return { kind: "inactive" };

  const window = checkinWindow(event, await getQrWindowSettings(admin));
  const state = windowState(window);
  if (state === "before") return { kind: "not_open", eventTitle: event.title, opensAt: window.opensAt.toISOString() };
  if (state === "after") return { kind: "closed", eventTitle: event.title };
  return event as EventRow;
}

function isEvent(v: EventRow | CheckinOutcome): v is EventRow {
  return "checkin_active" in v;
}

export async function evaluateCheckin(token: string, userId: string | null): Promise<CheckinOutcome> {
  const admin = createAdminClient();
  const event = await loadEvent(admin, token);
  if (!isEvent(event)) return event;
  if (!userId) return { kind: "login_required" };

  const { data: existing } = await admin
    .from("shg_event_attendance").select("id").eq("event_id", event.id).eq("user_id", userId).maybeSingle();
  if (existing) return { kind: "checked_in", eventTitle: event.title, eventId: event.id, alreadyCheckedIn: true };
  return { kind: "ready", eventTitle: event.title };
}

export async function performCheckin(token: string, user: { id: string; email: string }): Promise<CheckinOutcome> {
  const admin = createAdminClient();
  const event = await loadEvent(admin, token);
  if (!isEvent(event)) return event;

  const { created } = await recordAttendance(admin, event.id, user, "qr_checkin");
  return { kind: "checked_in", eventTitle: event.title, eventId: event.id, alreadyCheckedIn: !created };
}
