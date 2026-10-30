import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadUserActivity } from "@/lib/admin/userActivity";

// ─── GET /api/admin/users/[id]/details ──────────────────────────────────────
// What the expanded card in Admin › Usuarios shows: completed quests, event
// participations and badges — plus the quests/events the add buttons offer,
// so an admin with only the "users" permission doesn't need the Misiones or
// Eventos endpoints.

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("users");
  if (error) return error;

  const admin = createAdminClient();
  try {
    const [activity, { data: quests }, { data: events }] = await Promise.all([
      loadUserActivity(admin, params.id),
      admin.from("shg_quests")
        .select("id, title, type, status, reward_xp, reward_rp")
        .neq("status", "draft")
        .order("title"),
      admin.from("shg_events")
        .select("id, title, starts_at")
        .eq("status", "published")
        .order("starts_at", { ascending: false }),
    ]);
    return NextResponse.json({ data: { ...activity, options: { quests: quests ?? [], events: events ?? [] } } });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar el detalle del usuario." }, { status: 500 });
  }
}
