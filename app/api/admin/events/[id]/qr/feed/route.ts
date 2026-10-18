import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/events/[id]/qr/feed ─────────────────────────────────────
// Live claims feed for the host's phone: this event's QR turn-ins and QR
// party joins, newest first, plus the check-in count. Polled by the QR tab
// — Supabase realtime isn't an option here because SHG doesn't use Supabase
// Auth, and every shg_ table denies the anon key by RLS.

const LIMIT = 50;

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type UserInfo = { name: string | null; email: string };

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  const admin = createAdminClient();
  const [{ data: activations }, { data: groups }, { count: checkins }] = await Promise.all([
    admin
      .from("shg_quest_activations")
      .select("id, status, turned_in_at, quest:shg_quests(title), user:shg_users(name, email)")
      .eq("event_id", params.id).eq("source", "qr").not("turned_in_at", "is", null)
      .order("turned_in_at", { ascending: false })
      .limit(LIMIT),
    admin
      .from("shg_quest_groups")
      .select("id, status, quest:shg_quests(title), members:shg_quest_group_members(user_id, joined_at, user:shg_users(name, email))")
      .eq("event_id", params.id).eq("source", "qr")
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    admin.from("shg_event_attendance").select("id", { count: "exact", head: true }).eq("event_id", params.id),
  ]);

  const items: { id: string; at: string; player: string; mission: string; kind: "turn_in" | "party_join"; status: string }[] = [];

  for (const a of activations ?? []) {
    const user = one(a.user as unknown as UserInfo | UserInfo[] | null);
    items.push({
      id: `a-${a.id}`, at: a.turned_in_at as string, kind: "turn_in", status: a.status,
      player: user?.name || user?.email || "—",
      mission: one(a.quest as unknown as { title: string } | { title: string }[] | null)?.title ?? "—",
    });
  }
  for (const g of groups ?? []) {
    const mission = one(g.quest as unknown as { title: string } | { title: string }[] | null)?.title ?? "—";
    for (const m of (g.members ?? []) as unknown as { user_id: string; joined_at: string; user: UserInfo | UserInfo[] | null }[]) {
      const user = one(m.user);
      items.push({
        id: `g-${g.id}-${m.user_id}`, at: m.joined_at, kind: "party_join", status: g.status,
        player: user?.name || user?.email || "—", mission,
      });
    }
  }

  items.sort((a, b) => b.at.localeCompare(a.at));
  return NextResponse.json({ data: { items: items.slice(0, LIMIT), checkins: checkins ?? 0 } });
}
