import { NextRequest, NextResponse } from "next/server";
import { signUpSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { signPublicSession, setPublicSessionCookie } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const ALREADY_EXISTS = "Ya existe una cuenta con ese email. Iniciá sesión o usá un enlace mágico.";

// ─── POST /api/auth/sign-up ─────────────────────────────────────────────────
// Only ever creates a brand-new shg_users row — never attaches a password to
// one that already exists (that would let anyone "take over" an existing
// account with real bookings just by knowing its email address). A user who
// already has an account sets a password from their (authenticated) Profile
// page instead.

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: existing } = await admin.from("shg_users").select("id").eq("email", email).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: ALREADY_EXISTS }, { status: 409 });
  }

  const password_hash = await hashPassword(parsed.data.password);
  const { data: user, error: insertError } = await admin
    .from("shg_users")
    .insert({ email, name: parsed.data.name || null, password_hash })
    .select("id, email")
    .single();

  if (insertError || !user) {
    if (insertError?.code === "23505") {
      return NextResponse.json({ error: ALREADY_EXISTS }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 500 });
  }

  const sessionToken = await signPublicSession({ sub: user.id, email: user.email, kind: "public" });
  setPublicSessionCookie(sessionToken);

  return NextResponse.json({ ok: true }, { status: 201 });
}
