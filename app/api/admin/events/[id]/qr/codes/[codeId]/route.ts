import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { regenerateMissionCode } from "@/lib/qr/codes";
import { qrCodeUpdateSchema } from "@/lib/validation/qr";

// ─── PATCH /api/admin/events/[id]/qr/codes/[codeId] ─────────────────────────
// { active } toggles a mission's printed QR on/off; { regenerate: true }
// gives it a new token, which kills the old printed card immediately.

export async function PATCH(req: NextRequest, { params }: { params: { id: string; codeId: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = qrCodeUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });

  const admin = createAdminClient();
  const { data: code } = await admin
    .from("shg_event_mission_codes").select("id").eq("id", params.codeId).eq("event_id", params.id).maybeSingle();
  if (!code) return NextResponse.json({ error: "Código no encontrado." }, { status: 404 });

  if ("regenerate" in parsed.data) {
    const ok = await regenerateMissionCode(admin, params.codeId);
    if (!ok) return NextResponse.json({ error: "No se pudo regenerar el código." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error: updateError } = await admin
    .from("shg_event_mission_codes").update({ active: parsed.data.active }).eq("id", params.codeId);
  if (updateError) return NextResponse.json({ error: "No se pudo actualizar el código." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
