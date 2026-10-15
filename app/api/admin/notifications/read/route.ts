import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

const markReadSchema = z.object({
  // Omitted = mark every unread notification of this admin as read.
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
});

// ─── POST /api/admin/notifications/read ─────────────────────────────────────
// Always scoped to recipient_id = the signed-in admin, so ids belonging to
// someone else are silently ignored rather than marked.

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = markReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  let query = admin
    .from("shg_admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  if (parsed.data.ids) query = query.in("id", parsed.data.ids);

  const { error: updateError } = await query;
  if (updateError) return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
