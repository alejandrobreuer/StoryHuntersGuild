import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import {
  generateResetToken, RESET_TOKEN_TTL_MINUTES, RESET_REQUEST_COOLDOWN_SECONDS,
} from "@/lib/auth/passwordReset";
import { sendPasswordResetEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
// Always answers { ok: true } whether or not the email has an account, so
// this can't be used to probe which emails are registered. If it does, any
// earlier unused tokens are invalidated and a fresh single-use link is
// emailed — at most once per RESET_REQUEST_COOLDOWN_SECONDS per account, so
// it can't be used to flood someone's inbox.

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: user } = await admin
    .from("shg_users")
    .select("id, email, name")
    .eq("email", email)
    .maybeSingle();

  if (!user) return NextResponse.json({ ok: true });

  const { data: recent } = await admin
    .from("shg_password_reset_tokens")
    .select("created_at")
    .eq("user_id", user.id)
    .gt("created_at", new Date(Date.now() - RESET_REQUEST_COOLDOWN_SECONDS * 1000).toISOString())
    .limit(1)
    .maybeSingle();

  if (recent) return NextResponse.json({ ok: true });

  const now = new Date();
  await admin
    .from("shg_password_reset_tokens")
    .update({ used_at: now.toISOString() })
    .eq("user_id", user.id)
    .is("used_at", null);

  const { token, tokenHash } = generateResetToken();
  const { error: insertError } = await admin.from("shg_password_reset_tokens").insert({
    user_id:    user.id,
    token_hash: tokenHash,
    expires_at: new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60_000).toISOString(),
  });
  if (insertError) {
    console.error("[forgot-password] token insert failed:", insertError);
    return NextResponse.json({ ok: true });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  await sendPasswordResetEmail({
    email:            user.email,
    name:             user.name,
    resetUrl:         `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`,
    expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
  });

  return NextResponse.json({ ok: true });
}
