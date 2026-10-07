import { NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShgPlanningAssignee } from "@/types/database";

// Who can own an epic / be assigned a task — any shg_admin_user whose role
// currently has perm_planning. Deliberately separate from
// /api/admin/admins, which requires the "roles" permission a planning-only
// ("staff") admin won't have.
export async function GET() {
  const { error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_admin_users")
    .select("id, name, email, is_active, role:shg_security_roles(perm_planning)")
    .eq("is_active", true)
    .order("name");

  if (dbErr) return NextResponse.json({ error: "Error al obtener usuarios." }, { status: 500 });

  const assignees: ShgPlanningAssignee[] = (data ?? [])
    .filter((row) => {
      const role = Array.isArray(row.role) ? row.role[0] : row.role;
      return Boolean(role?.perm_planning);
    })
    .map((row) => ({ id: row.id, name: row.name, email: row.email }));

  return NextResponse.json({ data: assignees });
}
