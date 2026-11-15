import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { hashResetToken } from "@/lib/auth/passwordReset";
import { checkDisplayName } from "@/lib/auth/displayName";
import { createAdminClient } from "@/lib/supabase/admin";

const INVALID_LINK = "El enlace no es válido o ya venció. Pedí uno nuevo.";

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
// Consumes a token from /api/auth/forgot-password. The token is claimed with
// a conditional UPDATE (used_at is null, not expired) before the password
// changes, so two concurrent submissions of the same link can't both win.
// Also clears any login lockout — the user just proved control of the email.
// Doesn't sign the user in; they go to /sign-in with the new password.
//
// An account with no name yet (e.g. one staff created from just an email,
// see /api/admin/events/[id]/attendees) must also send `name`. It's checked
// before the token is claimed, so a rejected name doesn't burn the link.

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
  const tokenHash = hashResetToken(parsed.data.token);

  const { data: pending } = await admin
    .from("shg_password_reset_tokens")
    .select("user_id, user:shg_users(name)")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gt("expires_at", now)
    .maybeSingle();
  if (!pending) return NextResponse.json({ error: INVALID_LINK }, { status: 400 });

  const currentName = (pending.user as unknown as { name: string | null } | null)?.name ?? null;
  let newName: string | null = null;
  if (!currentName) {
    const check = await checkDisplayName(admin, parsed.data.name ?? "", pending.user_id);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
    newName = check.name;
  }

  const { data: claimed } = await admin
    .from("shg_password_reset_tokens")
    .update({ used_at: now })
    .eq("token_hash", tokenHash)
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

  // Separate from the password so a last-second name clash (someone took it
  // between the check and here) can't undo the password change; they can
  // pick another name from their profile.
  if (newName) {
    await admin.from("shg_users").update({ name: newName }).eq("id", claimed.user_id).is("name", null);
  }

  return NextResponse.json({ ok: true });
}
