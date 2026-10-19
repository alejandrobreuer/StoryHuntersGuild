import type { createAdminClient } from "@/lib/supabase/admin";
import type {
  FinancePayMethod, FinanceTxSource, FinanceTxStatus, FinanceTxType,
} from "@/types/database";
import { filtersRange, todayIso, type FinanceFilters } from "@/lib/finance/periods";

type AdminClient = ReturnType<typeof createAdminClient>;

/** One ledger row as the Movimientos page shows it. */
export interface LedgerRow {
  id:             string;
  occurred_on:    string;
  type:           FinanceTxType;
  description:    string;
  category_id:    string;
  category_name:  string;
  event_id:       string | null;
  event_title:    string | null;
  payment_method: FinancePayMethod;
  amount:         number;
  status:         FinanceTxStatus;
  source:         FinanceTxSource;
  booking_id:     string | null;
  booking_number: number | null;
  receipt_path:   string | null;
  has_receipt:    boolean;
  notes:          string | null;
  is_locked:      boolean;
  created_at:     string;
}

export interface LedgerTotals { income: number; expense: number; net: number }

export const LEDGER_SELECT = `
  id, occurred_on, type, description, category_id, event_id, payment_method, amount, status, source,
  booking_id, receipt_path, notes, is_locked, created_at,
  category:shg_finance_categories(name),
  event:shg_events(title),
  booking:shg_bookings(booking_number, receipt_path)
`;

type Embedded<T> = T | T[] | null;
function one<T>(v: Embedded<T>): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export interface RawRow {
  id: string; occurred_on: string; type: FinanceTxType; description: string; category_id: string;
  event_id: string | null; payment_method: FinancePayMethod; amount: number | string; status: FinanceTxStatus;
  source: FinanceTxSource; booking_id: string | null; receipt_path: string | null; notes: string | null;
  is_locked: boolean; created_at: string;
  category: Embedded<{ name: string }>;
  event: Embedded<{ title: string }>;
  booking: Embedded<{ booking_number: number; receipt_path: string | null }>;
}

export function toLedgerRow(r: RawRow): LedgerRow {
  const booking = one(r.booking);
  return {
    id: r.id, occurred_on: r.occurred_on, type: r.type, description: r.description,
    category_id: r.category_id, category_name: one(r.category)?.name ?? "—",
    event_id: r.event_id, event_title: one(r.event)?.title ?? null,
    payment_method: r.payment_method, amount: Number(r.amount), status: r.status, source: r.source,
    booking_id: r.booking_id, booking_number: booking?.booking_number ?? null,
    receipt_path: r.receipt_path,
    // A reservation's receipt lives on the booking, not on the ledger row.
    has_receipt: r.source === "booking" ? Boolean(booking?.receipt_path) : Boolean(r.receipt_path),
    notes: r.notes, is_locked: r.is_locked, created_at: r.created_at,
  };
}

/** Strips characters that would break a PostgREST or=() filter. */
function searchTerm(q: string): string {
  return q.replace(/[,()*%\\"'.:]/g, " ").trim();
}

/** The search also matches category names: look those up first. */
export async function searchCategoryIds(admin: AdminClient, f: FinanceFilters): Promise<string[]> {
  const term = searchTerm(f.q);
  if (!term) return [];
  const { data } = await admin.from("shg_finance_categories").select("id").ilike("name", `%${term}%`);
  return (data ?? []).map((c) => c.id as string);
}

/** The filter methods used here, so any select on shg_finance_transactions fits. */
interface Filterable {
  is(col: string, v: null): this; eq(col: string, v: string): this; gte(col: string, v: string): this;
  lte(col: string, v: string): this; or(filter: string): this;
}

/** Applies the ledger filters to a query on shg_finance_transactions.
 * Synchronous on purpose — query builders are thenables, so returning one
 * from an async function would run it. */
export function applyLedgerFilters<Q>(query: Q, f: FinanceFilters, categoryIds: string[]): Q {
  // Narrowed by hand: letting TypeScript check the real builder against
  // Filterable (or the select string literal) recurses too deep (TS2589).
  let q = (query as unknown as Filterable).is("deleted_at", null);
  if (f.tipo === "ingresos") q = q.eq("type", "income");
  if (f.tipo === "gastos")   q = q.eq("type", "expense");
  if (f.evento === "general") q = q.is("event_id", null);
  else if (f.evento) q = q.eq("event_id", f.evento);
  if (f.categoria) q = q.eq("category_id", f.categoria);

  const range = filtersRange(f, todayIso());
  if (range.from) q = q.gte("occurred_on", range.from);
  if (range.to)   q = q.lte("occurred_on", range.to);

  const term = searchTerm(f.q);
  if (term) {
    q = q.or([
      `description.ilike.%${term}%`,
      ...(categoryIds.length ? [`category_id.in.(${categoryIds.join(",")})`] : []),
    ].join(","));
  }
  return q as unknown as Q;
}

/** Footer totals for the filtered rows — cancelled excluded, like the dashboard. */
export function ledgerTotals(rows: { type: FinanceTxType; status: FinanceTxStatus; amount: number | string }[]): LedgerTotals {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    if (r.type === "income") income += Number(r.amount);
    else expense += Number(r.amount);
  }
  // Round to cents so floating point never shows up in the footer.
  income = Math.round(income * 100) / 100;
  expense = Math.round(expense * 100) / 100;
  return { income, expense, net: Math.round((income - expense) * 100) / 100 };
}

/** Turns a database error into something to show the admin. The triggers
 * already raise friendly Spanish messages; constraint names don't. */
export function financeDbError(err: { message?: string; code?: string } | null, fallback: string): string {
  const msg = err?.message ?? "";
  if (msg.includes("shg_finance_tx_amount_check")) return "El monto tiene que ser mayor a 0.";
  if (msg.includes("description_check")) return "Escribí el concepto.";
  if (msg.includes("violates foreign key constraint") && msg.includes("category")) return "Esa categoría ya tiene movimientos: desactivala en lugar de eliminarla.";
  if (msg.includes("shg_finance_categories_name_type_key")) return "Ya existe una categoría con ese nombre y tipo.";
  if (err?.code === "P0001" && msg) return msg;
  return fallback;
}
