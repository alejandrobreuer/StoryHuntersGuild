"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, type Plugin,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { cn } from "@/lib/utils";
import { PAY_METHOD_LABELS, formatCompact as compact, formatMoney } from "@/lib/finance/format";
import {
  filtersFromParams, filtersToParams, todayIso, type DateRange, type FinanceFilters, type PeriodKey,
} from "@/lib/finance/periods";
import {
  eventSubtitle, eventTotals, margin, monthLabel, perAttendee, rangeLabel, topCategory, percent,
  type FinanceSummary, type SummaryEvent,
} from "@/lib/finance/summary";
import type { ShgFinanceCategory } from "@/types/database";
import { Card, FinButton, focusRing, inputClass } from "@/components/admin/finance/ui";
import type { EventOption } from "@/components/admin/finance/LedgerRows";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// Dashboard — spec §4. Everything comes from one call to
// shg_finance_summary(), filtered exactly like the ledger, so a KPI and the
// ledger footer for the same filters describe the same rows.

const INCOME = "#1F5F8B";
const EXPENSE_BAR = "#D9894F";
const EMPTY = "Todavía no hay movimientos en este período.";

/** Draws each bar's value above it, as in the mockup. */
const barValues: Plugin<"bar"> = {
  id: "barValues",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = "11px var(--font-plex), system-ui, sans-serif";
    ctx.fillStyle = "#6A5B4C";
    ctx.textAlign = "center";
    chart.data.datasets.forEach((ds, i) => {
      chart.getDatasetMeta(i).data.forEach((bar, j) => {
        const v = Number(ds.data[j] ?? 0);
        ctx.fillText(compact(v), bar.x, bar.y - 6);
      });
    });
    ctx.restore();
  },
};

async function api<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Ocurrió un error.");
  return json.data as T;
}

const SEGMENTS: [PeriodKey, string][] = [["mes", "Este mes"], ["trimestre", "Trimestre"], ["todo", "Desde el inicio"], ["custom", "Personalizado"]];

export function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = React.useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const queryKey = filtersToParams(filters).toString();

  const [categories, setCategories] = React.useState<ShgFinanceCategory[]>([]);
  const [events, setEvents] = React.useState<EventOption[]>([]);
  const [data, setData] = React.useState<{ summary: FinanceSummary; range: DateRange } | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    api<{ categories: ShgFinanceCategory[]; events: EventOption[] }>("/api/admin/finance/options")
      .then((d) => { setCategories(d.categories); setEvents(d.events); })
      .catch((e: Error) => toast.error(e.message));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setFailed(false);
    api<{ summary: FinanceSummary; range: DateRange }>(`/api/admin/finance/summary?${queryKey}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e: Error) => { if (!cancelled) { setFailed(true); toast.error(e.message); } });
    return () => { cancelled = true; };
  }, [queryKey]);

  function setFilters(patch: Partial<FinanceFilters>) {
    const qs = filtersToParams({ ...filters, ...patch }).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  /** The ledger, showing the same rows (optionally one event's). */
  function ledgerHref(evento?: string): string {
    const qs = filtersToParams({ ...filters, ...(evento !== undefined ? { evento } : {}) }).toString();
    return qs ? `/admin/finanzas?${qs}` : "/admin/finanzas";
  }

  const today = todayIso();
  const s = data?.summary;
  const k = s?.kpis;
  const top = s ? topCategory(s.by_category) : null;
  const hasMoney = Boolean(s && (s.kpis.income || s.kpis.expense || s.monthly.some((m) => m.income || m.expense)));
  const categoryTotal = s?.by_category.reduce((sum, c) => sum + c.amount, 0) ?? 0;

  async function handleExport() {
    if (!s) return;
    const XLSX = await import("xlsx");
    const book = XLSX.utils.book_new();
    const add = (name: string, rows: object[]) => XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), name);
    add("Resumen", [
      { Concepto: "Período", Valor: data ? rangeLabel(data.range, s.monthly) : "" },
      { Concepto: "Ingresos", Valor: s.kpis.income },
      { Concepto: "Gastos", Valor: s.kpis.expense },
      { Concepto: "Resultado", Valor: s.kpis.result },
      { Concepto: "Por cobrar", Valor: s.kpis.receivable },
      { Concepto: "Por pagar", Valor: s.kpis.payable },
      { Concepto: "Lugares vendidos", Valor: s.kpis.seats },
    ]);
    add("Por mes", s.monthly.map((m) => ({ Mes: m.month.slice(0, 7), Ingresos: m.income, Gastos: m.expense, Resultado: m.income - m.expense })));
    add("Gastos por categoría", s.by_category.map((c) => ({ Categoría: c.name, Monto: c.amount, "%": percent(c.amount, categoryTotal) ?? 0 })));
    add("Por encuentro", s.per_event.map((e) => ({
      Encuentro: e.title ?? "Gastos generales", Lugares: e.seats, Ingresos: e.income, Gastos: e.expense,
      Resultado: e.result, "Por asistente": perAttendee(e) ?? "",
    })));
    XLSX.writeFile(book, `finanzas-dashboard-${today}.xlsx`);
  }

  return (
    <div className="mx-auto max-w-[1440px]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-fin-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-fin-muted">Cómo viene el gremio: lo que entra, lo que sale y cuánto deja cada encuentro.</p>
        </div>
        <FinButton kind="ghost" onClick={handleExport} disabled={!s}>
          <Download size={16} />Exportar a Excel
        </FinButton>
      </div>

      {/* Filters */}
      <Card className="mb-5 p-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div role="group" aria-label="Período" className="inline-flex rounded-lg border border-fin-input overflow-hidden">
          {SEGMENTS.map(([key, label]) => (
            <button
              key={key} type="button" aria-pressed={filters.periodo === key}
              onClick={() => setFilters({ periodo: key })}
              className={cn(
                "min-h-11 px-4 text-sm", focusRing,
                filters.periodo === key ? "bg-fin-ink text-white" : "bg-fin-surface text-fin-ink hover:bg-fin-alt",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {filters.periodo === "custom" && (
          <div className="flex items-center gap-2 text-sm text-fin-muted">
            <label className="flex items-center gap-1.5">
              Desde
              <input type="date" value={filters.desde} onChange={(e) => setFilters({ desde: e.target.value })} className={cn(inputClass, "h-11 w-auto")} />
            </label>
            <label className="flex items-center gap-1.5">
              Hasta
              <input type="date" value={filters.hasta} onChange={(e) => setFilters({ hasta: e.target.value })} className={cn(inputClass, "h-11 w-auto")} />
            </label>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-fin-muted">
          Evento
          <select value={filters.evento} onChange={(e) => setFilters({ evento: e.target.value })} className={cn(inputClass, "h-11 w-auto")}>
            <option value="">Todos los eventos</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            <option value="general">General</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-fin-muted">
          Categoría
          <select value={filters.categoria} onChange={(e) => setFilters({ categoria: e.target.value })} className={cn(inputClass, "h-11 w-auto")}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.type === "income" ? " (ingreso)" : " (gasto)"}</option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-fin-muted">{data ? rangeLabel(data.range, data.summary.monthly) : ""}</span>
          <Link href={ledgerHref()} className={cn("text-fin-crimson underline underline-offset-2", focusRing)}>
            Ver movimientos
          </Link>
        </div>
      </Card>

      {!s || !k ? (
        <p className="py-16 text-center text-fin-muted">{failed ? "No se pudo cargar el resumen." : "Cargando…"}</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-5">
            <Kpi label="Ingresos" value={k.income} tone="text-fin-income"
              sub={`${k.seats} ${k.seats === 1 ? "lugar vendido" : "lugares vendidos"} en ${k.seat_events} ${k.seat_events === 1 ? "encuentro" : "encuentros"}`} />
            <Kpi label="Gastos" value={k.expense} tone="text-fin-expense"
              sub={top ? `${top.share}% fue en ${top.name}` : "Sin gastos confirmados"}
              extra={k.payable > 0 ? `+ ${formatMoney(k.payable)} por pagar` : undefined} />
            <Kpi label="Resultado" value={k.result} tone="text-fin-ink"
              sub={margin(k) !== null ? `Margen del ${margin(k)}%` : undefined} />
            <Kpi label="Por cobrar" value={k.receivable} tone="text-fin-pending"
              sub={`${k.pending_bookings} ${k.pending_bookings === 1 ? "reserva" : "reservas"} con comprobante sin aprobar`} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] mb-5">
            {/* Monthly chart */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold">Ingresos vs. gastos por mes</h2>
                <div className="flex gap-4 text-sm text-fin-muted" aria-hidden>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: INCOME }} />Ingresos</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: EXPENSE_BAR }} />Gastos</span>
                </div>
              </div>
              {hasMoney ? (
                <div className="h-72">
                  <Bar
                    plugins={[barValues]}
                    data={{
                      labels: s.monthly.map((m) => monthLabel(m.month, today)),
                      datasets: [
                        { label: "Ingresos", data: s.monthly.map((m) => m.income), backgroundColor: INCOME, borderRadius: 3, maxBarThickness: 28 },
                        { label: "Gastos", data: s.monthly.map((m) => m.expense), backgroundColor: EXPENSE_BAR, borderRadius: 3, maxBarThickness: 28 },
                      ],
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      layout: { padding: { top: 18 } },
                      plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatMoney(Number(c.raw))}` } },
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: "#6A5B4C" } },
                        y: { beginAtZero: true, grid: { color: "#EFE7DA" }, border: { display: false },
                          ticks: { color: "#6A5B4C", maxTicksLimit: 4, callback: (v) => `$ ${compact(Number(v))}` } },
                      },
                    }}
                  />
                </div>
              ) : <Empty />}
            </Card>

            {/* Expenses by category */}
            <Card className="p-5">
              <h2 className="text-base font-semibold mb-3">Gastos por categoría</h2>
              {s.by_category.length ? (
                <ul className="flex flex-col gap-3.5">
                  {s.by_category.map((c) => {
                    const share = percent(c.amount, categoryTotal) ?? 0;
                    return (
                      <li key={c.category_id}>
                        <div className="flex justify-between gap-3 text-sm mb-1">
                          <span>{c.name}</span>
                          <span className="tabular-nums text-fin-muted">{formatMoney(c.amount)} · {share}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#F1E9DD]" role="img" aria-label={`${c.name}: ${share}%`}>
                          <div className="h-2 rounded-full bg-fin-expense" style={{ width: `${Math.max(share, 1)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : <Empty />}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {/* Result per event */}
            <Card className="p-5">
              <h2 className="text-base font-semibold mb-3">Resultado por encuentro</h2>
              {s.per_event.length ? (
                <EventTable rows={s.per_event} onOpen={(e) => router.push(ledgerHref(e.event_id ?? "general"))} hrefFor={(e) => ledgerHref(e.event_id ?? "general")} />
              ) : <Empty />}
            </Card>

            <div className="flex flex-col gap-5">
              {/* Pending bookings */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold">Reservas por aprobar</h2>
                  <Link href="/admin/bookings" className={cn("text-sm text-fin-crimson underline underline-offset-2", focusRing)}>Ir a Reservas</Link>
                </div>
                {s.pending_bookings.length ? (
                  <ul>
                    {s.pending_bookings.map((b) => (
                      <li key={b.id} className="flex justify-between gap-3 border-t border-fin-rowline py-3 first:border-t-0">
                        <div>
                          <p className="text-sm">
                            #{String(b.booking_number ?? "").padStart(4, "0")} · {b.guest_count} {b.guest_count === 1 ? "lugar" : "lugares"}
                          </p>
                          <p className="text-xs text-fin-muted">{b.event_title ?? "General"} · {PAY_METHOD_LABELS[b.payment_method]}</p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{formatMoney(b.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-3 text-sm text-fin-muted">No hay reservas esperando aprobación.</p>
                )}
              </Card>

              {/* Memberships — not built yet */}
              <div className="rounded-[10px] border border-dashed border-fin-input bg-fin-alt p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold">Membresías</h2>
                  <span className="rounded-full bg-fin-pending-bg px-2.5 py-0.5 text-xs font-medium text-fin-pending">Próximamente</span>
                </div>
                <p className="text-sm text-fin-muted">
                  Cuando actives una cuota mensual, acá vas a ver ingresos recurrentes, socios activos y bajas.
                  Los cobros entran como ingresos con la categoría Membresías.
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-3">
                  {["Ingreso mensual", "Socios activos", "Bajas del mes"].map((label) => (
                    <div key={label}>
                      <dt className="text-xs text-fin-muted">{label}</dt>
                      <dd className="text-lg text-fin-muted">—</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, tone, sub, extra }: { label: string; value: number; tone: string; sub?: string; extra?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-fin-muted">{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold tabular-nums", tone)}>{formatMoney(value)}</p>
      {sub && <p className="mt-1.5 text-sm text-fin-muted">{sub}</p>}
      {extra && <p className="mt-0.5 text-xs text-fin-expense">{extra}</p>}
    </Card>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-fin-muted">{EMPTY}</p>;
}

function EventTable({ rows, onOpen, hrefFor }: {
  rows: SummaryEvent[];
  onOpen: (e: SummaryEvent) => void;
  hrefFor: (e: SummaryEvent) => string;
}) {
  const totals = eventTotals(rows);
  const head = "px-2.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-fin-muted";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-fin-line">
            <th scope="col" className={cn(head, "text-left")}>Encuentro</th>
            <th scope="col" className={cn(head, "text-right")}>Lugares</th>
            <th scope="col" className={cn(head, "text-right")}>Ingresos</th>
            <th scope="col" className={cn(head, "text-right")}>Gastos</th>
            <th scope="col" className={cn(head, "text-right")}>Resultado</th>
            <th scope="col" className={cn(head, "text-right")}>Por asistente</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((e) => {
            const each = perAttendee(e);
            return (
              <tr
                key={e.event_id ?? "general"} onClick={() => onOpen(e)}
                className="cursor-pointer border-b border-fin-rowline hover:bg-fin-alt"
              >
                <td className="px-2.5 py-3">
                  <Link href={hrefFor(e)} onClick={(ev) => ev.stopPropagation()} className={cn("text-fin-ink no-underline hover:underline", focusRing)}>
                    {e.title ?? "Gastos generales"}
                  </Link>
                  <p className="text-xs text-fin-muted">{eventSubtitle(e)}</p>
                </td>
                <td className="px-2.5 py-3 text-right">{e.event_id ? e.seats : "—"}</td>
                <td className="px-2.5 py-3 text-right text-fin-income">{formatMoney(e.income)}</td>
                <td className="px-2.5 py-3 text-right text-fin-expense">{formatMoney(e.expense)}</td>
                <td className={cn("px-2.5 py-3 text-right font-semibold", e.result < 0 && "text-fin-expense")}>{formatMoney(e.result)}</td>
                <td className="px-2.5 py-3 text-right">{each === null ? "—" : formatMoney(each)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="tabular-nums font-semibold">
          <tr>
            <td className="px-2.5 py-3">Total</td>
            <td className="px-2.5 py-3 text-right">{totals.seats}</td>
            <td className="px-2.5 py-3 text-right text-fin-income">{formatMoney(totals.income)}</td>
            <td className="px-2.5 py-3 text-right text-fin-expense">{formatMoney(totals.expense)}</td>
            <td className={cn("px-2.5 py-3 text-right", totals.result < 0 && "text-fin-expense")}>{formatMoney(totals.result)}</td>
            <td className="px-2.5 py-3 text-right">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
