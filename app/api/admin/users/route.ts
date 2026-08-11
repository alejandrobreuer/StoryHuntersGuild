import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Explicit column list — never select("*") here, so password_hash and the
// lockout counters can never accidentally end up in a client response.
const SAFE_COLUMNS = "id, email, name, phone, xp, rp, is_subscriber, subscriber_since, created_at, last_login_at";

export async function GET() {
  const { error } = await requirePermission("users");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_users")
    .select(SAFE_COLUMNS)
    .order("created_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: "Error al obtener usuarios." }, { status: 500 });
  return NextResponse.json({ data });
}
