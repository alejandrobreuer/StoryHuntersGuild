import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

// ─── A player's completed quests, event participations and badges ───────────
// Shared by the expanded card in Admin › Usuarios (one user) and its export
// (every user), so both always show the same thing.

type BadgeRef = { id: string; name: string; icon: string | null; icon_url: string | null };
type EventRef = { id: string; title: string; starts_at: string };

export interface UserQuestRow {
  id: string; user_id: string; awarded_xp: number; awarded_rp: number; awarded_at: string;
  quest: { id: string; title: string; type: string; badge: BadgeRef | null } | null;
}
export interface UserParticipationRow {
  user_id: string; event: EventRef; source: string; date: string; rp: number;
}
export interface UserBadgeRow {
  user_id: string; awarded_at: string; badge: BadgeRef | null;
}
export interface UserActivity {
  quests: UserQuestRow[];
  participations: UserParticipationRow[];
  badges: UserBadgeRow[];
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

const PAGE = 1000;

/** PostgREST caps a response at 1000 rows; page through for the export. */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** userId null = every user. Throws on a database error. */
export async function loadUserActivity(admin: Admin, userId: string | null): Promise<UserActivity> {
  // null = no user filter (the export)
  const ids = userId ? [userId] : null;

  const [rewards, attendance, bookings, badges] = await Promise.all([
    fetchAll((from, to) => {
      const q = admin.from("shg_quest_rewards")
        .select("id, user_id, awarded_xp, awarded_rp, awarded_at, quest:shg_quests(id, title, type, badge:shg_badges(id, name, icon, icon_url))");
      return (ids ? q.in("user_id", ids) : q).order("awarded_at", { ascending: false }).order("id").range(from, to);
    }),
    fetchAll((from, to) => {
      const q = admin.from("shg_event_attendance")
        .select("id, user_id, event_id, source, checked_in_at, rp_awarded, booking:shg_bookings(rp_awarded), event:shg_events(id, title, starts_at)");
      return (ids ? q.in("user_id", ids) : q).order("id").range(from, to);
    }),
    fetchAll((from, to) => {
      const q = admin.from("shg_bookings")
        .select("id, user_id, event_id, rp_awarded, event:shg_events(id, title, starts_at)")
        .not("user_id", "is", null).eq("attended", true);
      return (ids ? q.in("user_id", ids) : q).order("id").range(from, to);
    }),
    fetchAll((from, to) => {
      const q = admin.from("shg_user_badges")
        .select("user_id, badge_id, awarded_at, badge:shg_badges(id, name, icon, icon_url)");
      return (ids ? q.in("user_id", ids) : q).order("awarded_at", { ascending: false }).order("badge_id").range(from, to);
    }),
  ]);

  // One participation per (user, event): the attendance row (QR, mission
  // claim or admin) and/or an attended booking ticked in Reservas.
  const participations = new Map<string, UserParticipationRow>();
  for (const a of attendance) {
    const event = one(a.event as unknown as EventRef | EventRef[] | null);
    if (!event) continue;
    const booking = one(a.booking as unknown as { rp_awarded: number } | null);
    participations.set(`${a.user_id}:${a.event_id}`, {
      user_id: a.user_id, event, source: a.source, date: a.checked_in_at,
      rp: a.rp_awarded + (booking?.rp_awarded ?? 0),
    });
  }
  for (const b of bookings) {
    const event = one(b.event as unknown as EventRef | EventRef[] | null);
    if (!event || !b.user_id) continue;
    const key = `${b.user_id}:${b.event_id}`;
    const existing = participations.get(key);
    if (existing) {
      if (existing.rp === 0) existing.rp = b.rp_awarded;
      continue;
    }
    participations.set(key, { user_id: b.user_id, event, source: "booking", date: event.starts_at, rp: b.rp_awarded });
  }

  return {
    quests: rewards.map((r) => {
      const quest = one(r.quest as unknown as { id: string; title: string; type: string; badge: unknown } | null);
      return {
        id: r.id, user_id: r.user_id, awarded_xp: r.awarded_xp, awarded_rp: r.awarded_rp, awarded_at: r.awarded_at,
        quest: quest ? { id: quest.id, title: quest.title, type: quest.type, badge: one(quest.badge as BadgeRef | null) } : null,
      };
    }),
    participations: Array.from(participations.values())
      .sort((a, b) => b.event.starts_at.localeCompare(a.event.starts_at)),
    badges: badges.map((b) => ({ user_id: b.user_id, awarded_at: b.awarded_at, badge: one(b.badge as unknown as BadgeRef | null) })),
  };
}
