import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { hashResetToken } from "@/lib/auth/passwordReset";
import { createAdminClient } from "@/lib/supabase/admin";

const INVALID_LINK = "El enlace no es válido o ya venció. Pedí uno nuevo.";

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
// Consumes a token from /api/auth/forgot-password. The token is claimed with
// a conditional UPDATE (used_at is null, not expired) before the password
// changes, so two concurrent submissions of the same link can't both win.
// Also clears any login lockout — the user just proved control of the email.
// Doesn't sign the user in; they go to /sign-in with the new password.

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: claimed } = await admin
    .from("shg_password_reset_tokens")
    .update({ used_at: now })
    .eq("token_hash", hashResetToken(parsed.data.token))
    .is("used_at", null)
    .gt("expires_at", now)
    .select("user_id")
    .maybeSingle();

  if (!claimed) return NextResponse.json({ error: INVALID_LINK }, { status: 400 });

  const password_hash = await hashPassword(parsed.data.newPassword);
  const { error: updateError } = await admin
    .from("shg_users")
    .update({ password_hash, failed_login_attempts: 0, locked_until: null })
    .eq("id", claimed.user_id);
  if (updateError) return NextResponse.json({ error: "No se pudo actualizar la contraseña." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
