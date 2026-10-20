import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { TX_TYPES } from "@/lib/validation/finance";

const orderSchema = z.object({
  type: z.enum(TX_TYPES),
  ids:  z.array(z.string().uuid()).min(1).max(200),
});

// ─── PUT /api/admin/finance/categories/order ────────────────────────────────
// The full order of one type's categories: sort_order becomes 1, 2, 3…
// System categories can be reordered like any other.

export async function PUT(req: NextRequest) {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Orden inválido." }, { status: 422 });

  const admin = createAdminClient();
  const results = await Promise.all(parsed.data.ids.map((id, i) =>
    admin.from("shg_finance_categories").update({ sort_order: i + 1 }).eq("id", id).eq("type", parsed.data.type),
  ));
  if (results.some((r) => r.error)) {
    return NextResponse.json({ error: "No se pudo guardar el orden." }, { status: 500 });
  }
  return NextResponse.json({ data: { ids: parsed.data.ids } });
}
