import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { financeDbError } from "@/lib/finance/ledger";
import { categorySchema } from "@/lib/validation/finance";

// ─── GET /api/admin/finance/categories ──────────────────────────────────────
// Every category, active or not, in display order.

export async function GET() {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_finance_categories").select("*").order("type").order("sort_order").order("name");
  if (dbErr) return NextResponse.json({ error: "No se pudieron cargar las categorías." }, { status: 500 });
  return NextResponse.json({ data });
}

// ─── POST /api/admin/finance/categories ─────────────────────────────────────
// A new category goes last in its type. sort_order in the body is ignored.

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.omit({ sort_order: true }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("shg_finance_categories").select("sort_order").eq("type", parsed.data.type)
    .order("sort_order", { ascending: false }).limit(1).maybeSingle();

  const { data, error: dbErr } = await admin
    .from("shg_finance_categories")
    .insert({ ...parsed.data, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("*").single();
  if (dbErr || !data) {
    return NextResponse.json({ error: financeDbError(dbErr, "No se pudo crear la categoría.") }, { status: 422 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
