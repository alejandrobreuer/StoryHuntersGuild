import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/users/[id]/details ──────────────────────────────────────
// What the expanded card in Admin › Usuarios shows: completed quests, event
// participations and badges — plus the quests/events the add buttons offer,
// so an admin with only the "users" permission doesn't need the Misiones or
// Eventos endpoints.

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

type EventRef = { id: string; title: string; starts_at: string };

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("users");
  if (error) return error;

  const admin = createAdminClient();
  const [rewardsRes, attendanceRes, bookingsRes, badgesRes, questsRes, eventsRes] = await Promise.all([
    admin.from("shg_quest_rewards")
      .select("id, awarded_xp, awarded_rp, awarded_at, quest:shg_quests(id, title, type, badge:shg_badges(name, icon, icon_url))")
      .eq("user_id", params.id)
      .order("awarded_at", { ascending: false }),
    admin.from("shg_event_attendance")
      .select("event_id, source, checked_in_at, rp_awarded, booking:shg_bookings(rp_awarded), event:shg_events(id, title, starts_at)")
      .eq("user_id", params.id),
    admin.from("shg_bookings")
      .select("event_id, rp_awarded, event:shg_events(id, title, starts_at)")
      .eq("user_id", params.id).eq("attended", true),
    admin.from("shg_user_badges")
      .select("awarded_at, badge:shg_badges(id, name, icon, icon_url)")
      .eq("user_id", params.id)
      .order("awarded_at", { ascending: false }),
    admin.from("shg_quests")
      .select("id, title, type, status, reward_xp, reward_rp")
      .neq("status", "draft")
      .order("title"),
    admin.from("shg_events")
      .select("id, title, starts_at")
      .eq("status", "published")
      .order("starts_at", { ascending: false }),
  ]);

  if (rewardsRes.error || attendanceRes.error || bookingsRes.error || badgesRes.error) {
    return NextResponse.json({ error: "No se pudo cargar el detalle del usuario." }, { status: 500 });
  }

  // One entry per event: the attendance row (QR, mission claim or admin) and/or
  // an attended booking ticked in Reservas.
  const participations = new Map<string, {
    event: EventRef; source: string; date: string; rp: number;
  }>();
  for (const a of attendanceRes.data ?? []) {
    const event = one(a.event as EventRef | EventRef[] | null);
    if (!event) continue;
    const booking = one(a.booking as { rp_awarded: number } | { rp_awarded: number }[] | null);
    participations.set(a.event_id, {
      event, source: a.source, date: a.checked_in_at, rp: a.rp_awarded + (booking?.rp_awarded ?? 0),
    });
  }
  for (const b of bookingsRes.data ?? []) {
    const event = one(b.event as EventRef | EventRef[] | null);
    if (!event) continue;
    const existing = participations.get(b.event_id);
    if (existing) {
      if (existing.rp === 0) existing.rp = b.rp_awarded;
      continue;
    }
    participations.set(b.event_id, { event, source: "booking", date: event.starts_at, rp: b.rp_awarded });
  }

  return NextResponse.json({
    data: {
      quests: (rewardsRes.data ?? []).map((r) => {
        const quest = one(r.quest as unknown as { id: string; title: string; type: string; badge: unknown } | null);
        return {
          id: r.id, awarded_xp: r.awarded_xp, awarded_rp: r.awarded_rp, awarded_at: r.awarded_at,
          quest: quest ? { id: quest.id, title: quest.title, type: quest.type, badge: one(quest.badge as never) } : null,
        };
      }),
      participations: Array.from(participations.values())
        .sort((a, b) => b.event.starts_at.localeCompare(a.event.starts_at)),
      badges: (badgesRes.data ?? []).map((b) => ({ awarded_at: b.awarded_at, badge: one(b.badge as never) })),
      options: { quests: questsRes.data ?? [], events: eventsRes.data ?? [] },
    },
  });
}
