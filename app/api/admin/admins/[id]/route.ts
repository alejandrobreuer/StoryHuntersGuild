import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/auth/password";
import { updateAdminUserSchema } from "@/lib/validation/admins";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission("roles");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = updateAdminUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  if (params.id === user.id && parsed.data.is_active === false) {
    return NextResponse.json({ error: "No podés desactivar tu propia cuenta." }, { status: 422 });
  }

  const { resetPassword, ...fields } = parsed.data;
  const patch: Record<string, unknown> = { ...fields };
  if (resetPassword) {
    patch.password_hash = await hashPassword(resetPassword);
    patch.failed_login_attempts = 0;
    patch.locked_until = null;
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_admin_users")
    .update(patch)
    .eq("id", params.id)
    .select("id, email, name, is_active, created_at, last_login_at, role:shg_security_roles(id, name)")
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar el administrador." }, { status: 500 });
  return NextResponse.json({ data });
}
