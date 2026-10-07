// ─── Shared formatting utilities ─────────────────────────────────────────────

export const ARS_FORMAT = new Intl.NumberFormat("es-AR", {
  style:                "currency",
  currency:             "ARS",
  maximumFractionDigits: 0,
});

export function formatARS(amount: number): string {
  return ARS_FORMAT.format(amount);
}

// Every event runs in Buenos Aires, so the display timezone is pinned rather
// than left to the runtime's local zone. Without this, these render correctly
// on the client (the visitor's browser is already on Argentina time) but wrong
// on the server (Next.js server components render in the host's UTC clock).
export const EVENT_TIME_ZONE = "America/Argentina/Buenos_Aires";

// en-CA formats as yyyy-mm-dd, which is exactly a `date` column's wire
// format — unlike formatDateTime/formatDate below, these pin a plain
// *date* (no time-of-day) to Buenos Aires, for comparisons like "is this
// task's due_date before today" that must not depend on the server's UTC
// clock rolling the date over at a different moment than Buenos Aires does.
const DATE_ONLY_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TIME_ZONE });

export function toISODateInEventTimeZone(d: Date | string): string {
  return DATE_ONLY_FORMAT.format(typeof d === "string" ? new Date(d) : d);
}

export function todayISOInEventTimeZone(): string {
  return DATE_ONLY_FORMAT.format(new Date());
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    hour:    "2-digit",
    minute:  "2-digit",
    timeZone: EVENT_TIME_ZONE,
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: EVENT_TIME_ZONE });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day:   "numeric",
    month: "long",
    year:  "numeric",
    timeZone: EVENT_TIME_ZONE,
  });
}

export function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function formatPlayers(min: number, max: number): string {
  return min === max ? `${min}` : `${min}–${max}`;
}

// ─── <input type="datetime-local"> round trip ────────────────────────────────
// The input speaks local wall clock with no zone; the database stores timestamptz.
// Both directions have to go through Date, or every edit shifts the saved time
// by the UTC offset.

export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
