import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE, ADMIN_SESSION_COOKIE,
  verifyPublicSession, verifyAdminSession,
} from "@/lib/auth/session";

// ─── Public session ─────────────────────────────────────────────────────────

export async function getSessionUser(): Promise<{ id: string; email: string } | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyPublicSession(token);
  if (!payload) return null;
  return { id: payload.sub, email: payload.email };
}

export async function requireSessionUser(): Promise<
  | { user: { id: string; email: string }; error: null }
  | { user: null; error: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }
  return { user, error: null };
}

// ─── Admin session ──────────────────────────────────────────────────────────
// Re-checks is_active fresh from the DB on every call — so revoking an admin
// takes effect immediately, not just at JWT expiry.

export async function getAdminUser(): Promise<{ id: string; email: string; role: string } | null> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAdminSession(token);
  if (!payload) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("shg_admin_users")
    .select("id, email, role, is_active")
    .eq("id", payload.sub)
    .maybeSingle();

  if (!data || !data.is_active) return null;
  return { id: data.id, email: data.email, role: data.role };
}

export async function requireAdmin(): Promise<
  | { user: { id: string; email: string; role: string }; error: null }
  | { user: null; error: NextResponse }
> {
  const user = await getAdminUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Acceso denegado." }, { status: 403 }) };
  }
  return { user, error: null };
}
