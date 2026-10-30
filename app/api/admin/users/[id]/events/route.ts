import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { userEventGrantSchema } from "@/lib/validation/users";
import { addParticipation } from "@/lib/events/participation";

// ─── POST /api/admin/users/[id]/events ──────────────────────────────────────
// Records that this player took part in an event (as if they'd checked in)
// and grants the event's RP reward.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("users");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = userEventGrantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Elegí un evento." }, { status: 422 });

  const admin = createAdminClient();
  const { data: target } = await admin.from("shg_users").select("id, email").eq("id", params.id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

  const result = await addParticipation(admin, target, parsed.data.eventId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true }, { status: 201 });
}
