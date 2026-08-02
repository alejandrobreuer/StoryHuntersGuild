import { NextRequest, NextResponse } from "next/server";
import { requestMagicLinkSchema } from "@/lib/validation/auth";
import { createMagicLinkToken } from "@/lib/auth/magic-link";
import { sendMagicLinkEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

const GENERIC_RESPONSE = { message: "Si el email es válido, te enviamos un enlace." };

// ─── POST /api/auth/request-admin-link ─────────────────────────────────────
// Checks shg_admin_users BEFORE generating a token — never reveals which
// emails are admins, and sends nothing for a non-admin/inactive email.

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

  const { data: adminUser } = await admin
    .from("shg_admin_users")
    .select("id, is_active")
    .eq("email", email)
    .maybeSingle();

  if (adminUser?.is_active) {
    const ip = req.headers.get("x-forwarded-for") ?? undefined;
    const token = await createMagicLinkToken(email, "admin", ip);
    if (token) await sendMagicLinkEmail(email, token, "admin");
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
