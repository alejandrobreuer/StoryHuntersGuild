import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { setPasswordSchema } from "@/lib/validation/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/auth/set-password ────────────────────────────────────────────
// Requires an existing session — safe to skip email re-verification here
// because getting a session already proves email ownership (via magic link
// or a prior password sign-in). If the account already has a password,
// the current one must be confirmed first (defense-in-depth against a
// stale/shared session); a magic-link-only account setting its first
// password doesn't need one.

export async function POST(req: NextRequest) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = setPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("shg_users")
    .select("password_hash")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.password_hash) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ error: "Ingresá tu contraseña actual." }, { status: 422 });
    }
    const valid = await verifyPassword(parsed.data.currentPassword, existing.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 401 });
    }
  }

  const password_hash = await hashPassword(parsed.data.newPassword);
  const { error: updateError } = await admin.from("shg_users").update({ password_hash }).eq("id", user.id);
  if (updateError) return NextResponse.json({ error: "No se pudo actualizar la contraseña." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
