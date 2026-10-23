import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { filtersFromParams } from "@/lib/finance/periods";
import {
  LEDGER_SELECT, applyLedgerFilters, financeDbError, ledgerTotals, runRecurring, searchMatches, toLedgerRow,
} from "@/lib/finance/ledger";
import { createTransactionSchema } from "@/lib/validation/finance";

const PAGE_SIZE = 100;
const EXPORT_LIMIT = 10_000;

// ─── GET /api/admin/finance/transactions ────────────────────────────────────
// Filters from the query string (same params as the page URL), plus
// ?offset= for "Cargar más", ?all=1 for the export, ?totals=1 for only the
// footer. Totals and the count
// always cover every filtered row, not just the loaded page.

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const params = req.nextUrl.searchParams;
  const filters = filtersFromParams(params);
  const all = params.get("all") === "1";
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  const admin = createAdminClient();

  // First load of the page: write any subscription rows that are due.
  if (offset === 0 && params.get("totals") !== "1") await runRecurring(admin);

  const matches = await searchMatches(admin, filters);

  const pageQuery = applyLedgerFilters(admin.from("shg_finance_transactions").select(LEDGER_SELECT), filters, matches)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(all ? 0 : offset, all ? EXPORT_LIMIT - 1 : offset + PAGE_SIZE - 1);

  const totalsQuery = applyLedgerFilters(
    admin.from("shg_finance_transactions").select("type, status, amount", { count: "exact" }), filters, matches,
  ).range(0, EXPORT_LIMIT - 1);

  // ?totals=1: just the footer (refreshed after each save), not the rows.
  const totalsOnly = params.get("totals") === "1";
  const [{ data, error: listErr }, { data: totalsRows, count, error: totalsErr }] = await Promise.all([
    totalsOnly ? Promise.resolve({ data: [], error: null }) : pageQuery,
    totalsQuery,
  ]);
  if (listErr || totalsErr) {
    return NextResponse.json({ error: "No se pudieron cargar los movimientos." }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      rows: (data ?? []).map(toLedgerRow),
      count: count ?? 0,
      totals: ledgerTotals(totalsRows ?? []),
      pageSize: PAGE_SIZE,
    },
  });
}

// ─── POST /api/admin/finance/transactions ───────────────────────────────────
// A new manual row, saved locked.

export async function POST(req: NextRequest) {
  const { user, error } = await requirePermission("finances");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: saved, error: rpcErr } = await admin.rpc("shg_finance_save", {
    p_admin_id: user.id, p_id: null, p_fields: { ...parsed.data, is_locked: true },
  });
  if (rpcErr || !saved) {
    return NextResponse.json({ error: financeDbError(rpcErr, "No se pudo guardar el movimiento.") }, { status: 422 });
  }

  const savedId = (Array.isArray(saved) ? saved[0] : saved).id as string;
  const { data: row } = await admin.from("shg_finance_transactions").select(LEDGER_SELECT).eq("id", savedId).single();
  return NextResponse.json({ data: row ? toLedgerRow(row) : null }, { status: 201 });
}
