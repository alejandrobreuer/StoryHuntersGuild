import { NextRequest, NextResponse } from "next/server";
import { signInSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/password";
import { signPublicSession, setPublicSessionCookie } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordLink } from "@/lib/auth/passwordLink";

const MAX_ATTEMPTS  = 5;
const LOCK_MINUTES  = 15;
const GENERIC_ERROR = "Email o contraseña incorrectos.";

// ─── POST /api/auth/sign-in ─────────────────────────────────────────────────
// Errors stay generic on both "no such user" and "wrong password" to avoid
// confirming which emails have accounts. Failed attempts lock the account
// for LOCK_MINUTES after MAX_ATTEMPTS.

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: user } = await admin
    .from("shg_users")
    .select("id, email, name, password_hash, failed_login_attempts, locked_until")
    .eq("email", email)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }
  if (!user.password_hash) {
    // Created from this email's bookings and never claimed: email the link
    // to choose a password (sign-up already reveals that the email exists).
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    await sendPasswordLink(admin, user, baseUrl, "setup");
    return NextResponse.json(
      { error: "Tu cuenta todavía no tiene contraseña. Te enviamos un email para que elijas una." },
      { status: 401 },
    );
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429 },
    );
  }

  const valid = await verifyPassword(parsed.data.password, user.password_hash);
  if (!valid) {
    const attempts = user.failed_login_attempts + 1;
    const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
    await admin
      .from("shg_users")
      .update({ failed_login_attempts: lockedUntil ? 0 : attempts, locked_until: lockedUntil })
      .eq("id", user.id);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await admin
    .from("shg_users")
    .update({ failed_login_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", user.id);

  const sessionToken = await signPublicSession({ sub: user.id, email: user.email, kind: "public" });
  setPublicSessionCookie(sessionToken);

  return NextResponse.json({ ok: true });
}
