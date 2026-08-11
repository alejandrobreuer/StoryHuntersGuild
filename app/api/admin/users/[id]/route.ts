import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/auth/password";
import { userAdjustSchema } from "@/lib/validation/users";

const SAFE_COLUMNS = "id, email, name, phone, xp, rp, is_subscriber, subscriber_since, created_at, last_login_at";

// ─── PATCH /api/admin/users/[id] ────────────────────────────────────────────
// Toggle subscriber status, apply a manual XP/RP correction (e.g. to fix a
// mis-recorded quest completion), and/or reset a user's password — there's
// no self-serve "forgot password" flow, so this is how staff gets someone
// back into their account. XP/RP adjustments go through the same atomic
// shg_award_user() function quest/event awards use, so a manual correction
// and an automatic grant can never race each other.

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("users");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = userAdjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { adjustXp, adjustRp, is_subscriber, resetPassword } = parsed.data;

  if (resetPassword) {
    const password_hash = await hashPassword(resetPassword);
    const { error: pwError } = await admin
      .from("shg_users")
      .update({ password_hash, failed_login_attempts: 0, locked_until: null })
      .eq("id", params.id);
    if (pwError) return NextResponse.json({ error: "No se pudo restablecer la contraseña." }, { status: 500 });
  }

  if (adjustXp || adjustRp) {
    const { error: rpcError } = await admin.rpc("shg_award_user", {
      p_user_id: params.id,
      p_xp: adjustXp ?? 0,
      p_rp: adjustRp ?? 0,
    });
    if (rpcError) return NextResponse.json({ error: "No se pudo ajustar XP/RP." }, { status: 500 });
  }

  if (is_subscriber !== undefined) {
    const patch: Record<string, unknown> = { is_subscriber };
    if (is_subscriber) {
      const { data: existing } = await admin
        .from("shg_users")
        .select("subscriber_since")
        .eq("id", params.id)
        .maybeSingle();
      if (!existing?.subscriber_since) patch.subscriber_since = new Date().toISOString();
    }
    const { error: updateError } = await admin.from("shg_users").update(patch).eq("id", params.id);
    if (updateError) return NextResponse.json({ error: "No se pudo actualizar la suscripción." }, { status: 500 });
  }

  const { data, error: fetchError } = await admin
    .from("shg_users")
    .select(SAFE_COLUMNS)
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError || !data) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  return NextResponse.json({ data });
}
