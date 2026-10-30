import { NextRequest, NextResponse } from "next/server";
import { signUpSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { signPublicSession, setPublicSessionCookie } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordLink } from "@/lib/auth/passwordLink";

const ALREADY_EXISTS = "Ya existe una cuenta con ese email. Iniciá sesión.";

// ─── POST /api/auth/sign-up ─────────────────────────────────────────────────
// Only ever creates a brand-new shg_users row — never attaches a password to
// one that already exists (that would let anyone "take over" an existing
// account with real bookings just by knowing its email address). A user who
// already has an account sets a password from their (authenticated) Profile
// page instead. An account that exists but has no password yet (created
// from its bookings) gets an email to choose one — see below.

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

  const { data: existing } = await admin
    .from("shg_users").select("id, email, name, password_hash").eq("email", email).maybeSingle();
  if (existing?.password_hash) {
    return NextResponse.json({ error: ALREADY_EXISTS }, { status: 409 });
  }
  if (existing) {
    // An account created from this email's bookings, never claimed. Taking
    // the password typed here would let anyone claim it just by knowing the
    // email, so the owner proves the inbox instead: we email them the link
    // to choose a password.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    await sendPasswordLink(admin, existing, baseUrl, "setup");
    return NextResponse.json({ data: { setupEmailSent: true } });
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
