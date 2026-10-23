import type {
  FinancePayMethod, FinanceTxStatus, FinanceTxType, ShgFinanceCategory,
} from "@/types/database";
import type { LedgerRow } from "@/lib/finance/ledger";
import { amountToInput, parseAmount } from "@/lib/finance/format";

// An unlocked row being edited in Movimientos. Everything is kept as the
// inputs hold it (amount as typed text) until it's saved.

export interface Draft {
  id:             string;     // the row's id, or "new:<n>" for a row not saved yet
  isNew:          boolean;
  occurred_on:    string;
  type:           FinanceTxType;
  description:    string;
  category_id:    string;
  event_id:       string;     // "" = General
  payment_method: FinancePayMethod;
  amount:         string;
  status:         FinanceTxStatus;
  receipt_path:   string | null;
  notes:          string;
  responsible_id: string;     // "" = nobody
  fromBooking:    boolean;    // a Reservas income row: type, Responsable and receipt stay as they are
  showNotes:      boolean;
}

export type DraftField = "occurred_on" | "description" | "category_id" | "amount";
export type DraftErrors = Partial<Record<DraftField, string>>;

export interface SavePayload {
  occurred_on:    string;
  type:           FinanceTxType;
  description:    string;
  category_id:    string;
  event_id:       string | null;
  payment_method: FinancePayMethod;
  amount:         number;
  status:         FinanceTxStatus;
  receipt_path:   string | null;
  notes:          string | null;
  responsible_id: string | null;
}

export function draftFromRow(row: LedgerRow): Draft {
  return {
    id: row.id, isNew: false,
    occurred_on: row.occurred_on, type: row.type, description: row.description,
    category_id: row.category_id, event_id: row.event_id ?? "",
    payment_method: row.payment_method, amount: amountToInput(row.amount), status: row.status,
    receipt_path: row.receipt_path, notes: row.notes ?? "", showNotes: Boolean(row.notes),
    responsible_id: row.responsible_id ?? "",
    fromBooking: row.source === "booking",
  };
}

/** The category a new row of this type starts with: Insumos for expenses,
 * Reservas for income (spec §3), else the first active one of the type. */
export function defaultCategoryId(type: FinanceTxType, categories: ShgFinanceCategory[]): string {
  const active = categories.filter((c) => c.type === type && c.is_active);
  const preferred = type === "expense"
    ? active.find((c) => c.name === "Insumos")
    : active.find((c) => c.system_key === "bookings");
  return (preferred ?? active[0])?.id ?? "";
}

/** `responsibleId` is the admin creating it: they usually paid. */
export function newDraft(
  id: string, type: FinanceTxType, today: string, categories: ShgFinanceCategory[], responsibleId = "",
): Draft {
  return {
    id, isNew: true, occurred_on: today, type, description: "",
    category_id: defaultCategoryId(type, categories), event_id: "",
    payment_method: "transfer", amount: "", status: "confirmed",
    receipt_path: null, notes: "", showNotes: false, responsible_id: responsibleId,
    fromBooking: false,
  };
}

/** Switching type keeps the category only if it belongs to the new type. */
export function withType(draft: Draft, type: FinanceTxType, categories: ShgFinanceCategory[]): Draft {
  const current = categories.find((c) => c.id === draft.category_id);
  return {
    ...draft, type,
    category_id: current?.type === type ? draft.category_id : defaultCategoryId(type, categories),
  };
}

export function validateDraft(draft: Draft, categories: ShgFinanceCategory[]): DraftErrors {
  const errors: DraftErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.occurred_on)) errors.occurred_on = "Elegí la fecha.";
  if (!draft.description.trim()) errors.description = "Escribí el concepto.";
  const amount = parseAmount(draft.amount);
  // A reservation can legitimately be $0 (free event, 100% coupon).
  if (amount === null || amount < 0 || (amount === 0 && !draft.fromBooking)) {
    errors.amount = "El monto tiene que ser un número mayor a 0.";
  }
  const category = categories.find((c) => c.id === draft.category_id);
  if (!category) errors.category_id = "Elegí una categoría.";
  else if (category.type !== draft.type) errors.category_id = "La categoría no corresponde al tipo.";
  return errors;
}

/** Only call after validateDraft returned no errors. */
export function draftToPayload(draft: Draft): SavePayload {
  return {
    occurred_on: draft.occurred_on,
    type: draft.type,
    description: draft.description.trim(),
    category_id: draft.category_id,
    event_id: draft.event_id || null,
    payment_method: draft.payment_method,
    amount: parseAmount(draft.amount) ?? 0,
    status: draft.status,
    receipt_path: draft.receipt_path,
    notes: draft.notes.trim() || null,
    responsible_id: draft.responsible_id || null,
  };
}
