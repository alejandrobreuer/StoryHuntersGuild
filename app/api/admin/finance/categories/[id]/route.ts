import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { financeDbError } from "@/lib/finance/ledger";
import { categorySchema } from "@/lib/validation/finance";

// ─── PATCH /api/admin/finance/categories/[id] ───────────────────────────────
// Rename, change type, (de)activate. What a system or used category may not
// change is refused by the database (shg_finance_category_guard).

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.omit({ sort_order: true }).partial().safeParse(body);
  if (!parsed.success || !Object.keys(parsed.data).length) {
    return NextResponse.json({ error: parsed.error?.issues[0]?.message ?? "Nada para guardar." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_finance_categories").update(parsed.data).eq("id", params.id).select("*").maybeSingle();
  if (dbErr) {
    return NextResponse.json({ error: financeDbError(dbErr, "No se pudo guardar la categoría.") }, { status: 422 });
  }
  if (!data) return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
  return NextResponse.json({ data });
}

// ─── DELETE /api/admin/finance/categories/[id] ──────────────────────────────
// Only unused, non-system categories: the database refuses the rest (a used
// one by its foreign key, even if its movements were deleted — they're kept
// for history), and the message suggests deactivating it instead.

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const admin = createAdminClient();
  const { error: dbErr, count } = await admin
    .from("shg_finance_categories").delete({ count: "exact" }).eq("id", params.id);
  if (dbErr) {
    return NextResponse.json({ error: financeDbError(dbErr, "No se pudo eliminar la categoría.") }, { status: 422 });
  }
  if (!count) return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
  return NextResponse.json({ data: { id: params.id } });
}
