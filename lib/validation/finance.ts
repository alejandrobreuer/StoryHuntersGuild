import { z } from "zod";

// The ledger's write payloads. The database enforces the real rules (lock,
// read-only reservations, category/type match); this only shapes input and
// gives friendly messages first.

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.");

export const TX_TYPES = ["income", "expense"] as const;
export const TX_STATUSES = ["confirmed", "pending", "cancelled"] as const;
export const PAY_METHODS = ["transfer", "mercado_pago", "cash", "card", "other"] as const;

const fields = {
  occurred_on:    isoDate,
  type:           z.enum(TX_TYPES),
  description:    z.string().trim().min(1, "Escribí el concepto.").max(300),
  category_id:    uuid,
  event_id:       uuid.nullable(),
  payment_method: z.enum(PAY_METHODS),
  amount:         z.number().positive("El monto tiene que ser mayor a 0.").max(9_999_999_999),
  status:         z.enum(TX_STATUSES),
  receipt_path:   z.string().max(300).nullable(),
  notes:          z.string().trim().max(1000).nullable(),
  responsible_id: uuid.nullable(),
};

/** New row: everything but receipt/notes/responsable required; saved locked.
 * Without responsible_id the database puts whoever is saving it. */
export const createTransactionSchema = z.object({
  ...fields,
  receipt_path:   fields.receipt_path.optional(),
  notes:          fields.notes.optional(),
  responsible_id: fields.responsible_id.optional(),
});

/** Existing row: any subset of fields, plus the lock. Unlock = { is_locked: false };
 * save = { ...changes, is_locked: true }. */
export const updateTransactionSchema = z
  .object({ ...fields, is_locked: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nada para guardar.");

export const categorySchema = z.object({
  name:       z.string().trim().min(1, "Escribí el nombre.").max(60),
  type:       z.enum(TX_TYPES),
  is_active:  z.boolean(),
  sort_order: z.number().int().min(0).max(10_000),
});
