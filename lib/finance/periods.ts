// Date ranges and URL filters shared by Movimientos and the Dashboard.
// Dates are plain "YYYY-MM-DD" strings in Argentina time — the ledger's
// occurred_on is a date, so no time zones past this point.

export const FINANCE_TZ = "America/Argentina/Buenos_Aires";

export type PeriodKey = "mes" | "mes-anterior" | "trimestre" | "anio" | "todo" | "custom";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  "mes": "Este mes",
  "mes-anterior": "Mes anterior",
  "trimestre": "Trimestre",
  "anio": "Año",
  "todo": "Desde el inicio",
  "custom": "Personalizado…",
};

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Today in Argentina as "YYYY-MM-DD". */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FINANCE_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function iso(y: number, m: number, d: number): string {
  // m is 1-based and may overflow/underflow; Date.UTC normalises it.
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toISOString().slice(0, 10);
}

function lastDay(y: number, m: number): string {
  return iso(y, m + 1, 0);
}

export interface DateRange { from: string | null; to: string | null }

/** The inclusive range a period covers. "Trimestre" is the current month
 * plus the two before it; "todo" is unbounded. */
export function periodRange(period: PeriodKey, today: string, custom?: DateRange): DateRange {
  const [y, m] = today.split("-").map(Number);
  switch (period) {
    case "mes":          return { from: iso(y, m, 1), to: lastDay(y, m) };
    case "mes-anterior": return { from: iso(y, m - 1, 1), to: lastDay(y, m - 1) };
    case "trimestre":    return { from: iso(y, m - 2, 1), to: lastDay(y, m) };
    case "anio":         return { from: iso(y, 1, 1), to: iso(y, 12, 31) };
    case "todo":         return { from: null, to: null };
    case "custom":       return { from: custom?.from || null, to: custom?.to || null };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Agosto – noviembre 2026", "Octubre 2026", "Diciembre 2025 – febrero 2026". */
export function describeRange(from: string, to: string): string {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  if (fy === ty && fm === tm) return `${capitalize(MONTHS[fm - 1])} ${fy}`;
  if (fy === ty) return `${capitalize(MONTHS[fm - 1])} – ${MONTHS[tm - 1]} ${ty}`;
  return `${capitalize(MONTHS[fm - 1])} ${fy} – ${MONTHS[tm - 1]} ${ty}`;
}

/** Short month label for charts: "Ago", "Nov". */
export function shortMonth(isoMonth: string): string {
  const m = Number(isoMonth.slice(5, 7));
  return capitalize(MONTHS[m - 1].slice(0, 3));
}

// ─── URL filters ─────────────────────────────────────────────────────────────
// Kept in the query string so a filtered view can be bookmarked or shared:
//   ?q=fundas&tipo=gastos&evento=<uuid>|general&periodo=mes&desde=&hasta=&categoria=<uuid>

export type TypeFilter = "todos" | "ingresos" | "gastos";

export interface FinanceFilters {
  q:         string;
  tipo:      TypeFilter;
  evento:    string;      // "" = all, "general" = no event, else an event id
  periodo:   PeriodKey;
  desde:     string;      // custom range only
  hasta:     string;
  categoria: string;      // "" = all
}

const PERIODS = Object.keys(PERIOD_LABELS) as PeriodKey[];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ParamSource = { get(name: string): string | null };

export function filtersFromParams(params: ParamSource, defaultPeriod: PeriodKey = "todo"): FinanceFilters {
  const tipo = params.get("tipo");
  const periodo = params.get("periodo") as PeriodKey | null;
  const evento = params.get("evento") ?? "";
  const categoria = params.get("categoria") ?? "";
  const desde = params.get("desde") ?? "";
  const hasta = params.get("hasta") ?? "";
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    tipo: tipo === "ingresos" || tipo === "gastos" ? tipo : "todos",
    evento: evento === "general" || UUID.test(evento) ? evento : "",
    periodo: periodo && PERIODS.includes(periodo) ? periodo : defaultPeriod,
    desde: ISO_DATE.test(desde) ? desde : "",
    hasta: ISO_DATE.test(hasta) ? hasta : "",
    categoria: UUID.test(categoria) ? categoria : "",
  };
}

/** Only non-default values, so a plain view has a clean URL. */
export function filtersToParams(f: FinanceFilters, defaultPeriod: PeriodKey = "todo"): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.tipo !== "todos") p.set("tipo", f.tipo);
  if (f.evento) p.set("evento", f.evento);
  if (f.periodo !== defaultPeriod) p.set("periodo", f.periodo);
  if (f.periodo === "custom") {
    if (f.desde) p.set("desde", f.desde);
    if (f.hasta) p.set("hasta", f.hasta);
  }
  if (f.categoria) p.set("categoria", f.categoria);
  return p;
}

export function filtersRange(f: FinanceFilters, today: string): DateRange {
  return periodRange(f.periodo, today, { from: f.desde || null, to: f.hasta || null });
}
