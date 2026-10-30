import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { sendPasswordLink } from "@/lib/auth/passwordLink";
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
    .select("id, email, name, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (!user) return NextResponse.json({ ok: true });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  // An account made from its bookings has no password yet: same link, worded as activating it.
  await sendPasswordLink(admin, user, baseUrl, user.password_hash ? "reset" : "setup");

  return NextResponse.json({ ok: true });
}
