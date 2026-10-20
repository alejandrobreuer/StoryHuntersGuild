import type { FinancePayMethod } from "@/types/database";
import { FINANCE_TZ, describeRange, shortMonth, type DateRange } from "@/lib/finance/periods";

// What shg_finance_summary() returns (050_shg_finance.sql) and the small
// derivations the Dashboard shows on top of it. The money math itself stays
// in SQL so the dashboard and the ledger can't drift apart.

export interface SummaryKpis {
  income: number; expense: number; result: number;
  seats: number; seat_events: number;
  receivable: number; payable: number; pending_bookings: number;
}
export interface SummaryMonth { month: string; income: number; expense: number }
export interface SummaryCategory { category_id: string; name: string; amount: number }
export interface SummaryEvent {
  event_id: string | null; title: string | null;
  starts_at: string | null; started_at: string | null; ended_at: string | null;
  seats: number; income: number; expense: number; result: number;
}
export interface SummaryPendingBooking {
  id: string; booking_id: string | null; booking_number: number | null; guest_count: number | null;
  amount: number; payment_method: FinancePayMethod; event_title: string | null;
}
export interface FinanceSummary {
  kpis: SummaryKpis;
  monthly: SummaryMonth[];
  by_category: SummaryCategory[];
  per_event: SummaryEvent[];
  pending_bookings: SummaryPendingBooking[];
}

/** Whole-number percentage, or null when there's nothing to divide by. */
export function percent(part: number, whole: number): number | null {
  if (!whole) return null;
  return Math.round((part / whole) * 100);
}

/** "Margen del X%" — hidden (null) when there's no income. */
export function margin(k: SummaryKpis): number | null {
  return percent(k.result, k.income);
}

/** The biggest expense category and its share, for "X% fue en …". */
export function topCategory(categories: SummaryCategory[]): { name: string; share: number } | null {
  const total = categories.reduce((s, c) => s + c.amount, 0);
  const top = categories[0];
  if (!top || !total) return null;
  return { name: top.name, share: percent(top.amount, total) ?? 0 };
}

/** Resultado / lugares, or null for a row without seats. */
export function perAttendee(e: Pick<SummaryEvent, "result" | "seats">): number | null {
  return e.seats > 0 ? Math.round(e.result / e.seats) : null;
}

/** Second line of an event in "Resultado por encuentro": "Octubre · cerrado". */
export function eventSubtitle(e: SummaryEvent): string {
  if (!e.event_id) return "Ludoteca, web y otros sin evento";
  const month = e.starts_at
    ? new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: FINANCE_TZ }).format(new Date(e.starts_at))
    : "";
  const state = e.ended_at ? "cerrado"
    : e.started_at ? "en curso"
    : "reservas abiertas";
  return [month.charAt(0).toUpperCase() + month.slice(1), state].filter(Boolean).join(" · ");
}

/** Chart label for a month; the current one reads "Nov (en curso)". */
export function monthLabel(isoMonth: string, today: string): string {
  const label = shortMonth(isoMonth);
  return isoMonth.slice(0, 7) === today.slice(0, 7) ? `${label} (en curso)` : label;
}

/** The text on the right of the filter bar. An open range ("Desde el
 * inicio") is described by the months the data actually spans. */
export function rangeLabel(range: DateRange, monthly: SummaryMonth[]): string {
  const from = range.from ?? monthly[0]?.month ?? null;
  const to = range.to ?? monthly[monthly.length - 1]?.month ?? null;
  if (!from || !to) return "";
  return describeRange(from, to);
}

/** Column totals for the per-event table. They equal the KPIs, because the
 * "Gastos generales" row holds everything without an event. */
export function eventTotals(rows: SummaryEvent[]): { seats: number; income: number; expense: number; result: number } {
  const t = rows.reduce(
    (acc, r) => ({ seats: acc.seats + r.seats, income: acc.income + r.income, expense: acc.expense + r.expense }),
    { seats: 0, income: 0, expense: 0 },
  );
  const round = (n: number) => Math.round(n * 100) / 100;
  return { seats: t.seats, income: round(t.income), expense: round(t.expense), result: round(t.income - t.expense) };
}
