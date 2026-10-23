import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { financeDbError, runRecurring } from "@/lib/finance/ledger";
import { updateRecurringSchema } from "@/lib/validation/finance";

// ─── PATCH /api/admin/finance/recurring/[id] ────────────────────────────────
// Edit or pause/resume. Changes apply to the months still to come; rows
// already in Movimientos stay as they are. Resuming restarts it from today
// (shg_finance_recurring_guard), so paused months aren't charged.

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateRecurringSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_finance_recurring").update(parsed.data).eq("id", params.id).select("*").maybeSingle();
  if (dbErr) {
    return NextResponse.json({ error: financeDbError(dbErr, "No se pudo guardar la suscripción.") }, { status: 422 });
  }
  if (!data) return NextResponse.json({ error: "Suscripción no encontrada." }, { status: 404 });
  await runRecurring(admin);
  return NextResponse.json({ data });
}

// ─── DELETE /api/admin/finance/recurring/[id] ───────────────────────────────
// Only while it hasn't generated any movement: the database refuses the rest
// by its foreign key, and the message suggests pausing it instead.

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const admin = createAdminClient();
  const { error: dbErr, count } = await admin
    .from("shg_finance_recurring").delete({ count: "exact" }).eq("id", params.id);
  if (dbErr) {
    return NextResponse.json({ error: financeDbError(dbErr, "No se pudo eliminar la suscripción.") }, { status: 422 });
  }
  if (!count) return NextResponse.json({ error: "Suscripción no encontrada." }, { status: 404 });
  return NextResponse.json({ data: { id: params.id } });
}
