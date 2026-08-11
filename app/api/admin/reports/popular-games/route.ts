import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/reports/popular-games ──────────────────────────────────
// Games ranked by SUM(guest_count) of approved bookings on events featuring them.

export async function GET() {
  const { error } = await requirePermission("reports");
  if (error) return error;

  const admin = createAdminClient();

  const { data: links } = await admin
    .from("shg_event_games")
    .select("game_id, game:shg_games(name), event:shg_events(id, status)");

  const { data: approvedBookings } = await admin
    .from("shg_bookings")
    .select("event_id, guest_count")
    .eq("status", "approved");

  const guestsByEvent = new Map<string, number>();
  for (const b of approvedBookings ?? []) {
    guestsByEvent.set(b.event_id, (guestsByEvent.get(b.event_id) ?? 0) + b.guest_count);
  }

  const byGame = new Map<string, { name: string; guests: number }>();
  for (const link of links ?? []) {
    const event = link.event as unknown as { id: string } | null;
    const game  = link.game as unknown as { name: string } | null;
    if (!event || !game) continue;
    const guests = guestsByEvent.get(event.id) ?? 0;
    const prev = byGame.get(link.game_id) ?? { name: game.name, guests: 0 };
    byGame.set(link.game_id, { name: game.name, guests: prev.guests + guests });
  }

  const data = Array.from(byGame.values()).sort((a, b) => b.guests - a.guests).slice(0, 10);
  return NextResponse.json({ data });
}
