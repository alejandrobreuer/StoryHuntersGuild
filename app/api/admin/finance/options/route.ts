import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/finance/options ─────────────────────────────────────────
// What the ledger's selects offer: every category (inactive ones too, so old
// rows still show their name) and every event, newest first.

export async function GET() {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const admin = createAdminClient();
  const [{ data: categories, error: catErr }, { data: events, error: evErr }] = await Promise.all([
    admin.from("shg_finance_categories").select("*").order("type").order("sort_order").order("name"),
    admin.from("shg_events").select("id, title, starts_at").order("starts_at", { ascending: false }),
  ]);
  if (catErr || evErr) {
    return NextResponse.json({ error: "No se pudieron cargar las opciones." }, { status: 500 });
  }
  return NextResponse.json({ data: { categories, events } });
}
