import { NextRequest, NextResponse } from "next/server";
import { requestMagicLinkSchema } from "@/lib/validation/auth";
import { createMagicLinkToken } from "@/lib/auth/magic-link";
import { sendMagicLinkEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

const GENERIC_RESPONSE = { message: "Si el email es válido, te enviamos un enlace." };

// ─── POST /api/auth/request-magic-link ─────────────────────────────────────
// Always returns the same generic response regardless of whether the email
// exists — no account-enumeration signal.

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = requestMagicLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const admin = createAdminClient();

  // Upsert the shg_users row so a sign-in also creates the account on first use.
  await admin.from("shg_users").upsert({ email }, { onConflict: "email", ignoreDuplicates: true });

  const ip = req.headers.get("x-forwarded-for") ?? undefined;
  const token = await createMagicLinkToken(email, "public", ip);

  if (token) {
    await sendMagicLinkEmail(email, token, "public");
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
