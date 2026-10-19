import type { FinancePayMethod, FinanceTxStatus, FinanceTxType } from "@/types/database";

// Formatting + parsing for Finanzas. ARS only; es-AR conventions
// ("$ 16.000", "4.500,50", DD/MM/YY).

export const TYPE_LABELS: Record<FinanceTxType, string> = { income: "Ingreso", expense: "Gasto" };

export const STATUS_LABELS: Record<FinanceTxStatus, string> = {
  confirmed: "Confirmado", pending: "Pendiente", cancelled: "Cancelado",
};

export const PAY_METHOD_LABELS: Record<FinancePayMethod, string> = {
  transfer: "Transferencia", mercado_pago: "Mercado Pago", cash: "Efectivo", card: "Tarjeta", other: "Otro",
};

const moneyFormat = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const moneyFormatCents = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "$ 16.000" — decimals only when there are cents ("$ 4.500,50"). */
export function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  const hasCents = Math.round(abs * 100) % 100 !== 0;
  const body = (hasCents ? moneyFormatCents : moneyFormat).format(abs);
  return `${amount < 0 ? "− " : ""}$ ${body}`;
}

/** "+ $ 16.000" for income, "− $ 18.500" for expenses. */
export function formatSignedMoney(type: FinanceTxType, amount: number): string {
  return `${type === "income" ? "+" : "−"} ${formatMoney(Math.abs(amount))}`;
}

/** "YYYY-MM-DD" → "DD/MM/YY". */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** Parses what people type in the amount cell. Accepts "4500", "4.500",
 * "4500,50", "4.500,50", "$ 4.500" and "4500.50". With a comma, dots are
 * thousands separators; without one, a dot followed by exactly three digits
 * is a thousands separator ("4.500") and otherwise a decimal point. Returns
 * null for anything that isn't a number. */
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/\$/g, "").replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    if ((s.match(/,/g) ?? []).length > 1) return null;
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** An amount as it should appear in the editing input: "4500" / "4500,5". */
export function amountToInput(amount: number): string {
  return String(amount).replace(".", ",");
}
