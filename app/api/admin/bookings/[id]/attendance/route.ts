import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { attendanceSchema } from "@/lib/validation/bookings";

// ─── POST /api/admin/bookings/[id]/attendance ───────────────────────────────
// Only approved bookings can have attendance recorded — pending/rejected/
// cancelled registrants were never confirmed to begin with.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = attendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_bookings")
    .update({ attended: parsed.data.attended })
    .eq("id", params.id)
    .eq("status", "approved")
    .select()
    .single();

  if (updateError || !data) {
    return NextResponse.json({ error: "No se pudo actualizar la asistencia." }, { status: 422 });
  }
  return NextResponse.json({ data });
}
