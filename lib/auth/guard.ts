import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { permissionMapFromRole, type PermissionMap } from "@/lib/auth/permissions";
import {
  SESSION_COOKIE, ADMIN_SESSION_COOKIE,
  verifyPublicSession, verifyAdminSession,
} from "@/lib/auth/session";
import type { PermissionKey } from "@/types/database";

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
// Re-checks is_active + the role's permissions fresh from the DB on every
// call — so revoking an admin, or flipping a permission off on their role,
// takes effect immediately, not just at JWT expiry. Nothing beyond
// {sub, email} is trusted from the token itself (see ShgAdminSessionPayload).

export interface AdminSessionUser {
  id:          string;
  email:       string;
  roleId:      string;
  roleName:    string;
  permissions: PermissionMap;
}

export async function getAdminUser(): Promise<AdminSessionUser | null> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAdminSession(token);
  if (!payload) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("shg_admin_users")
    .select("id, email, is_active, role:shg_security_roles(*)")
    .eq("id", payload.sub)
    .maybeSingle();

  if (!data || !data.is_active) return null;

  const role = Array.isArray(data.role) ? data.role[0] : data.role;
  if (!role || !role.can_access_admin) return null;

  return {
    id: data.id,
    email: data.email,
    roleId: role.id,
    roleName: role.name,
    permissions: permissionMapFromRole(role),
  };
}

export async function requireAdmin(): Promise<
  | { user: AdminSessionUser; error: null }
  | { user: null; error: NextResponse }
> {
  const user = await getAdminUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Acceso denegado." }, { status: 403 }) };
  }
  return { user, error: null };
}

/** Same as requireAdmin(), plus a specific admin-panel-section permission —
 * use this in every feature's API routes instead of requireAdmin() directly. */
export async function requirePermission(key: PermissionKey): Promise<
  | { user: AdminSessionUser; error: null }
  | { user: null; error: NextResponse }
> {
  const { user, error } = await requireAdmin();
  if (error) return { user: null, error };
  if (!user.permissions[key]) {
    return { user: null, error: NextResponse.json({ error: "No tenés permiso para esta sección." }, { status: 403 }) };
  }
  return { user, error: null };
}

/** Page-level equivalent for Server Components (app/admin/(dashboard)/*\/page.tsx)
 * — redirects instead of returning a response. Defense in depth: the
 * sidebar already hides links a role can't see, but this stops direct URL
 * access to a section the current admin isn't permitted to use. */
export async function requireAdminPagePermission(key: PermissionKey): Promise<AdminSessionUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  if (!user.permissions[key]) redirect("/admin");
  return user;
}
