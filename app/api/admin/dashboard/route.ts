import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [pendingReceipts, upcomingEvents, approvedBookings, librarySize] = await Promise.all([
    admin.from("shg_bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("shg_events").select("id", { count: "exact", head: true }).eq("status", "published").gte("starts_at", now),
    admin.from("shg_bookings").select("guest_count").eq("status", "approved"),
    admin.from("shg_games").select("id", { count: "exact", head: true }),
  ]);

  const confirmedSpots = (approvedBookings.data ?? []).reduce((sum, b) => sum + b.guest_count, 0);

  return NextResponse.json({
    data: {
      pendingReceipts: pendingReceipts.count ?? 0,
      upcomingEvents:  upcomingEvents.count ?? 0,
      confirmedSpots,
      librarySize:     librarySize.count ?? 0,
    },
  });
}
