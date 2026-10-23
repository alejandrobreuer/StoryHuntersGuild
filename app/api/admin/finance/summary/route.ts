import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { filtersFromParams, filtersRange, todayIso } from "@/lib/finance/periods";
import { runRecurring } from "@/lib/finance/ledger";

// ─── GET /api/admin/finance/summary ─────────────────────────────────────────
// The Dashboard's numbers, from shg_finance_summary(). Same query params as
// the ledger (?periodo=&desde=&hasta=&evento=&categoria=), so the two always
// describe the same rows. The dashboard opens on "Desde el inicio".

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const filters = filtersFromParams(req.nextUrl.searchParams);
  const range = filtersRange(filters, todayIso());

  const admin = createAdminClient();
  await runRecurring(admin);
  const { data, error: rpcErr } = await admin.rpc("shg_finance_summary", {
    p_from: range.from,
    p_to: range.to,
    p_event_id: filters.evento && filters.evento !== "general" ? filters.evento : null,
    p_general: filters.evento === "general",
    p_category_id: filters.categoria || null,
  });
  if (rpcErr || !data) {
    return NextResponse.json({ error: "No se pudo calcular el resumen." }, { status: 500 });
  }
  return NextResponse.json({ data: { summary: data, range } });
}
