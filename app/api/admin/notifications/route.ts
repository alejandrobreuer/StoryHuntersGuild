import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

const LIST_LIMIT = 30;

// ─── GET /api/admin/notifications ───────────────────────────────────────────
// The signed-in admin's most recent notifications plus their unread count,
// for the sidebar bell (components/admin/NotificationBell.tsx). Any admin,
// regardless of permissions — everyone only ever sees their own rows.

export async function GET() {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const [{ data, error: dbErr }, { count }] = await Promise.all([
    admin
      .from("shg_admin_notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    admin
      .from("shg_admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
  ]);

  if (dbErr) return NextResponse.json({ error: "Error al obtener notificaciones." }, { status: 500 });
  return NextResponse.json({ data: data ?? [], unread: count ?? 0 });
}
