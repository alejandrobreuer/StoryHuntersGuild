import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { regenerateCheckinToken } from "@/lib/qr/codes";
import { qrCodeUpdateSchema } from "@/lib/validation/qr";

// ─── PATCH /api/admin/events/[id]/qr/checkin ────────────────────────────────
// Same contract as a mission code's PATCH, for the event's entrance QR.

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = qrCodeUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });

  const admin = createAdminClient();

  if ("regenerate" in parsed.data) {
    const ok = await regenerateCheckinToken(admin, params.id);
    if (!ok) return NextResponse.json({ error: "No se pudo regenerar el código." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data: updated, error: updateError } = await admin
    .from("shg_events").update({ checkin_active: parsed.data.active }).eq("id", params.id).select("id").maybeSingle();
  if (updateError) return NextResponse.json({ error: "No se pudo actualizar el código." }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
