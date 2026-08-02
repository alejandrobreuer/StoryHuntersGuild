import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/reports/attendance ─────────────────────────────────────
// Approved guest_count summed by month, over the last 6 months.

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: bookings } = await admin
    .from("shg_bookings")
    .select("guest_count, created_at, event:shg_events(starts_at)")
    .eq("status", "approved")
    .gte("created_at", sixMonthsAgo.toISOString());

  const byMonth = new Map<string, number>();
  for (const b of bookings ?? []) {
    const event = b.event as unknown as { starts_at: string } | null;
    const date = event?.starts_at ?? b.created_at;
    const key = new Date(date).toLocaleDateString("es-AR", { year: "numeric", month: "short" });
    byMonth.set(key, (byMonth.get(key) ?? 0) + b.guest_count);
  }

  const data = Array.from(byMonth.entries()).map(([month, guests]) => ({ month, guests }));
  return NextResponse.json({ data });
}
