import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { consumeMagicLinkToken } from "@/lib/auth/magic-link";
import { signPublicSession, signAdminSession, setPublicSessionCookie, ADMIN_SESSION_COOKIE } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /auth/verify?token=... ────────────────────────────────────────────
// Route handler, not a page — needs to set cookies + redirect mid-request.

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${appUrl}/sign-in?error=missing_token`);
  }

  const consumed = await consumeMagicLinkToken(token);
  if (!consumed) {
    return NextResponse.redirect(`${appUrl}/sign-in?error=expired`);
  }

  const admin = createAdminClient();

  if (consumed.purpose === "admin") {
    const { data: adminUser } = await admin
      .from("shg_admin_users")
      .select("id, email, role, is_active")
      .eq("email", consumed.email)
      .maybeSingle();

    if (!adminUser || !adminUser.is_active) {
      return NextResponse.redirect(`${appUrl}/admin/login?error=not_admin`);
    }

    await admin.from("shg_admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", adminUser.id);

    const sessionToken = await signAdminSession({
      sub: adminUser.id, email: adminUser.email, role: adminUser.role, kind: "admin",
    });
    cookies().set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12,
    });
    return NextResponse.redirect(`${appUrl}/admin`);
  }

  // Public sign-in
  const { data: user } = await admin
    .from("shg_users")
    .select("id, email")
    .eq("email", consumed.email)
    .maybeSingle();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/sign-in?error=expired`);
  }

  await admin.from("shg_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);

  const sessionToken = await signPublicSession({ sub: user.id, email: user.email, kind: "public" });
  setPublicSessionCookie(sessionToken);

  const next = req.nextUrl.searchParams.get("next") || "/my-bookings";
  return NextResponse.redirect(`${appUrl}${next}`);
}
