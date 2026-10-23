import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEDGER_SELECT, financeDbError, toLedgerRow } from "@/lib/finance/ledger";
import { updateTransactionSchema } from "@/lib/validation/finance";

// ─── PATCH /api/admin/finance/transactions/[id] ─────────────────────────────
// Unlock: { is_locked: false }. Save: { ...changes, is_locked: true }.
// The lock and what a Reservas row may not change (type, Responsable,
// deletion — 055) are enforced by the database; its message comes back as
// the error.

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission("finances");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { error: rpcErr } = await admin.rpc("shg_finance_save", {
    p_admin_id: user.id, p_id: params.id, p_fields: parsed.data,
  });
  if (rpcErr) {
    return NextResponse.json({ error: financeDbError(rpcErr, "No se pudo guardar el movimiento.") }, { status: 422 });
  }

  const { data: row } = await admin.from("shg_finance_transactions").select(LEDGER_SELECT).eq("id", params.id).single();
  return NextResponse.json({ data: row ? toLedgerRow(row) : null });
}

// ─── DELETE /api/admin/finance/transactions/[id] ────────────────────────────
// Soft delete; the database only allows it on unlocked manual rows.

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission("finances");
  if (error) return error;

  const admin = createAdminClient();
  const { error: rpcErr } = await admin.rpc("shg_finance_delete", { p_admin_id: user.id, p_id: params.id });
  if (rpcErr) {
    return NextResponse.json({ error: financeDbError(rpcErr, "No se pudo eliminar el movimiento.") }, { status: 422 });
  }
  return NextResponse.json({ data: { id: params.id } });
}
