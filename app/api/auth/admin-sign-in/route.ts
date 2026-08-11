import { NextRequest, NextResponse } from "next/server";
import { signInSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/password";
import { signAdminSession, setAdminSessionCookie } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS  = 5;
const LOCK_MINUTES  = 15;
const GENERIC_ERROR = "Email o contraseña incorrectos.";

// ─── POST /api/auth/admin-sign-in ───────────────────────────────────────────
// Same shape as the public /api/auth/sign-in — generic error on "no such
// admin", "wrong password", inactive account, or a role with
// can_access_admin off, so none of those are distinguishable from outside.

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

  const { data: adminUser } = await admin
    .from("shg_admin_users")
    .select("id, email, password_hash, failed_login_attempts, locked_until, is_active, role:shg_security_roles(can_access_admin)")
    .eq("email", email)
    .maybeSingle();

  const role = adminUser ? (Array.isArray(adminUser.role) ? adminUser.role[0] : adminUser.role) : null;

  if (!adminUser || !adminUser.password_hash || !adminUser.is_active || !role?.can_access_admin) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (adminUser.locked_until && new Date(adminUser.locked_until) > new Date()) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429 },
    );
  }

  const valid = await verifyPassword(parsed.data.password, adminUser.password_hash);
  if (!valid) {
    const attempts = adminUser.failed_login_attempts + 1;
    const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
    await admin
      .from("shg_admin_users")
      .update({ failed_login_attempts: lockedUntil ? 0 : attempts, locked_until: lockedUntil })
      .eq("id", adminUser.id);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await admin
    .from("shg_admin_users")
    .update({ failed_login_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", adminUser.id);

  const sessionToken = await signAdminSession({ sub: adminUser.id, email: adminUser.email, kind: "admin" });
  setAdminSessionCookie(sessionToken);

  return NextResponse.json({ ok: true });
}
