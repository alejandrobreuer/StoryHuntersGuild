import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { financeDbError, runRecurring } from "@/lib/finance/ledger";
import { recurringSchema } from "@/lib/validation/finance";

// ─── GET /api/admin/finance/recurring ───────────────────────────────────────
// Every subscription, active first, then by name. Runs the generator first,
// so "Próximo cobro" is never a date whose row is still missing.

export async function GET() {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const admin = createAdminClient();
  await runRecurring(admin);
  const { data, error: dbErr } = await admin
    .from("shg_finance_recurring").select("*")
    .order("is_active", { ascending: false }).order("name");
  if (dbErr) return NextResponse.json({ error: "No se pudieron cargar las suscripciones." }, { status: 500 });
  return NextResponse.json({ data });
}

// ─── POST /api/admin/finance/recurring ──────────────────────────────────────
// A new subscription. Any month already due since "Desde" is written right
// away, so the ledger shows it on the next load.

export async function POST(req: NextRequest) {
  const { user, error } = await requirePermission("finances");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = recurringSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_finance_recurring").insert({ ...parsed.data, created_by: user.id }).select("*").single();
  if (dbErr || !data) {
    return NextResponse.json({ error: financeDbError(dbErr, "No se pudo crear la suscripción.") }, { status: 422 });
  }
  await runRecurring(admin);
  return NextResponse.json({ data }, { status: 201 });
}
