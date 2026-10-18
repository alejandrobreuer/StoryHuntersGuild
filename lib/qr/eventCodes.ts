import { createAdminClient } from "@/lib/supabase/admin";
import { ensureEventQrCodes } from "@/lib/qr/codes";
import type { QuestDifficulty, QuestType } from "@/types/database";

type Admin = ReturnType<typeof createAdminClient>;

export interface EventQrEvent {
  id: string; title: string; slug: string; starts_at: string; ends_at: string | null;
  checkin_token: string; checkin_active: boolean;
}

export interface EventQrCode {
  id: string; token: string; active: boolean; rotated_at: string | null;
  quest: {
    id: string; title: string; type: QuestType; difficulty: QuestDifficulty; narrative: string | null;
    game: { name: string } | null;
  };
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/**
 * The event plus one code per mission currently attached to it — after
 * making sure every one of those codes (and the check-in token) exists.
 * Shared by the admin QR tab, the ZIP export and card printing so they all
 * agree on which codes exist. Null if the event doesn't exist.
 */
export async function loadEventQrCodes(
  admin: Admin,
  eventId: string
): Promise<{ event: EventQrEvent; codes: EventQrCode[] } | null> {
  const { data: before } = await admin.from("shg_events").select("id, checkin_token").eq("id", eventId).maybeSingle();
  if (!before) return null;

  await ensureEventQrCodes(admin, eventId, before.checkin_token);

  const [{ data: event }, { data: links }, { data: codes }] = await Promise.all([
    admin.from("shg_events").select("id, title, slug, starts_at, ends_at, checkin_token, checkin_active").eq("id", eventId).single(),
    admin.from("shg_quest_events").select("quest_id").eq("event_id", eventId),
    admin
      .from("shg_event_mission_codes")
      .select("id, token, active, rotated_at, quest:shg_quests(id, title, type, difficulty, narrative, game:shg_games(name))")
      .eq("event_id", eventId),
  ]);
  if (!event) return null;

  const linked = new Set((links ?? []).map((l) => l.quest_id as string));
  const rows: EventQrCode[] = [];
  for (const c of codes ?? []) {
    const quest = one(c.quest as unknown as (Omit<EventQrCode["quest"], "game"> & { game: { name: string } | { name: string }[] | null }));
    if (!quest || !linked.has(quest.id)) continue;
    rows.push({
      id: c.id, token: c.token, active: c.active, rotated_at: c.rotated_at,
      quest: { ...quest, game: one(quest.game) },
    });
  }
  rows.sort((a, b) => a.quest.title.localeCompare(b.quest.title, "es"));

  return { event: event as EventQrEvent, codes: rows };
}

/** Filesystem-safe slug for download names ({event-slug}_{mission-slug}.png). */
export function fileSlug(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "codigo";
}
