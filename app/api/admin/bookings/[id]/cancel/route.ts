import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: rpcError } = await admin.rpc("shg_cancel_booking", {
    p_booking_id: params.id,
    p_admin_id:   user.id,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message || "No se pudo cancelar la reserva." }, { status: 422 });
  }

  return NextResponse.json({ data: Array.isArray(data) ? data[0] : data });
}
