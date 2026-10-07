import { NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Minimal event list for the epic "linked event" picker — deliberately
// separate from /api/admin/events, which requires the "events" permission
// a planning-only ("staff") admin won't have.
export async function GET() {
  const { error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_events")
    .select("id, title, starts_at")
    .order("starts_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: "Error al obtener eventos." }, { status: 500 });
  return NextResponse.json({ data });
}
