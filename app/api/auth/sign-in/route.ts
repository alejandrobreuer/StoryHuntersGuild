import { NextRequest, NextResponse } from "next/server";
import { signInSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/password";
import { signPublicSession, setPublicSessionCookie } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS  = 5;
const LOCK_MINUTES  = 15;
const GENERIC_ERROR = "Email o contraseña incorrectos.";

// ─── POST /api/auth/sign-in ─────────────────────────────────────────────────
// Password sign-in, alongside (not replacing) the magic-link flow. Errors
// stay generic on both "no such user" and "wrong password" to avoid
// confirming which emails have accounts. Failed attempts lock the account
// for LOCK_MINUTES after MAX_ATTEMPTS — magic link doesn't need this (it's
// already rate-limited per-email at the token-request level), but a
// password is a guessable secret that wasn't rate-limited before.

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
    .select("id, email, password_hash, failed_login_attempts, locked_until")
    .eq("email", email)
    .maybeSingle();

  if (!user || !user.password_hash) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos o usá un enlace mágico." },
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
