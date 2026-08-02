import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/bookings?eventId=&status= ──────────────────────────────

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const eventId = req.nextUrl.searchParams.get("eventId");
  const status  = req.nextUrl.searchParams.get("status");

  const admin = createAdminClient();
  let query = admin
    .from("shg_bookings")
    .select("*, event:shg_events(id, title, starts_at)")
    .order("created_at", { ascending: false });

  if (eventId) query = query.eq("event_id", eventId);
  if (status)  query = query.eq("status", status);

  const { data, error: dbErr } = await query;
  if (dbErr) return NextResponse.json({ error: "Error al obtener reservas." }, { status: 500 });
  return NextResponse.json({ data });
}
