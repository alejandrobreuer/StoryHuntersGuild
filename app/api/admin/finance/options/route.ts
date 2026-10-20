import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/finance/options ─────────────────────────────────────────
// What the ledger's selects offer: every category (inactive ones too, so old
// rows still show their name), every event, newest first, and the team for
// "Responsable" — every admin user, not only those with Finanzas (inactive
// ones too, for old rows; the select only offers active ones). `me` is the
// admin asking, the default Responsable of a new row.

export async function GET() {
  const { user, error } = await requirePermission("finances");
  if (error) return error;

  const admin = createAdminClient();
  const [
    { data: categories, error: catErr },
    { data: events, error: evErr },
    { data: team, error: teamErr },
  ] = await Promise.all([
    admin.from("shg_finance_categories").select("*").order("type").order("sort_order").order("name"),
    admin.from("shg_events").select("id, title, starts_at").order("starts_at", { ascending: false }),
    admin.from("shg_admin_users").select("id, name, is_active").order("name"),
  ]);
  if (catErr || evErr || teamErr) {
    return NextResponse.json({ error: "No se pudieron cargar las opciones." }, { status: 500 });
  }
  return NextResponse.json({ data: { categories, events, team, me: user.id } });
}
