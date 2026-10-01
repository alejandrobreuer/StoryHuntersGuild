import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("bookings");
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_coupons").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar el cupón." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
