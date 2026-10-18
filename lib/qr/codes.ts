import { createAdminClient } from "@/lib/supabase/admin";
import { generateQrToken } from "@/lib/qr/tokens";

type Admin = ReturnType<typeof createAdminClient>;

// Mission codes are created automatically — the admin never generates them
// by hand. syncEventMissionCodes runs whenever an event's mission list is
// saved; ensureEventQrCodes runs when the admin QR tab loads, which also
// backfills events that predate the QR feature.

/** Insert, retrying on the (astronomically unlikely) token collision. A
 * unique violation is either that, or a concurrent request having just
 * created this same (event, quest) row — in which case there's nothing to do. */
async function insertMissionCode(admin: Admin, eventId: string, questId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await admin
      .from("shg_event_mission_codes")
      .insert({ event_id: eventId, quest_id: questId, token: generateQrToken() });
    if (!error) return;
    if (error.code !== "23505") throw error;
    const { data: row } = await admin
      .from("shg_event_mission_codes").select("id").eq("event_id", eventId).eq("quest_id", questId).maybeSingle();
    if (row) return;
  }
}

/**
 * Brings an event's mission codes in line with its mission list:
 * - creates a code for every attached mission that doesn't have one yet;
 * - re-activates the code of a mission that was just (re-)attached;
 * - deactivates codes of missions no longer attached, so a printed card for
 *   a removed mission stops working.
 * previouslyLinked is the quest list before this save, used to tell a fresh
 * attach (reactivate) from a mission that simply stayed attached (leave the
 * admin's manual on/off choice alone).
 */
export async function syncEventMissionCodes(
  admin: Admin,
  eventId: string,
  questIds: string[],
  previouslyLinked: string[] = []
): Promise<void> {
  const { data: existing } = await admin
    .from("shg_event_mission_codes")
    .select("id, quest_id, active")
    .eq("event_id", eventId);
  const rows = existing ?? [];
  const byQuest = new Map(rows.map((r) => [r.quest_id as string, r]));
  const linked = new Set(questIds);
  const wasLinked = new Set(previouslyLinked);

  for (const questId of questIds) {
    const row = byQuest.get(questId);
    if (!row) {
      await insertMissionCode(admin, eventId, questId);
    } else if (!row.active && !wasLinked.has(questId)) {
      await admin.from("shg_event_mission_codes").update({ active: true }).eq("id", row.id);
    }
  }

  const toDeactivate = rows.filter((r) => r.active && !linked.has(r.quest_id)).map((r) => r.id);
  if (toDeactivate.length > 0) {
    await admin.from("shg_event_mission_codes").update({ active: false }).in("id", toDeactivate);
  }
}

/** Makes sure the event has a check-in token. Returns it. */
export async function ensureCheckinToken(admin: Admin, eventId: string, current: string | null): Promise<string> {
  if (current) return current;
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateQrToken();
    const { data, error } = await admin
      .from("shg_events")
      .update({ checkin_token: token })
      .eq("id", eventId)
      .is("checkin_token", null)
      .select("checkin_token")
      .maybeSingle();
    if (!error && data?.checkin_token) return data.checkin_token as string;
    if (!error) {
      // Lost a race with another request — read back whatever it set.
      const { data: row } = await admin.from("shg_events").select("checkin_token").eq("id", eventId).maybeSingle();
      if (row?.checkin_token) return row.checkin_token as string;
    }
  }
  throw new Error("Could not assign a check-in token.");
}

/** Check-in token + one code per attached mission. Idempotent. */
export async function ensureEventQrCodes(admin: Admin, eventId: string, checkinToken: string | null): Promise<void> {
  const { data: links } = await admin.from("shg_quest_events").select("quest_id").eq("event_id", eventId);
  const questIds = (links ?? []).map((l) => l.quest_id as string);
  // Treat every currently-linked mission as "already linked" so this never
  // overrides an admin's manual deactivation.
  await Promise.all([
    ensureCheckinToken(admin, eventId, checkinToken),
    syncEventMissionCodes(admin, eventId, questIds, questIds),
  ]);
}

/** New token on the same row — the old printed QR stops working immediately. */
export async function regenerateMissionCode(admin: Admin, codeId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await admin
      .from("shg_event_mission_codes")
      .update({ token: generateQrToken(), rotated_at: new Date().toISOString() })
      .eq("id", codeId)
      .select("id")
      .maybeSingle();
    if (!error) return Boolean(data);
    if (error.code !== "23505") return false;
  }
  return false;
}

export async function regenerateCheckinToken(admin: Admin, eventId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await admin
      .from("shg_events")
      .update({ checkin_token: generateQrToken() })
      .eq("id", eventId)
      .select("id")
      .maybeSingle();
    if (!error) return Boolean(data);
    if (error.code !== "23505") return false;
  }
  return false;
}
