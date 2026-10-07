import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAdminUserSchema } from "@/lib/validation/admins";

const ADMIN_ROW_COLUMNS = "id, email, name, is_active, created_at, last_login_at, user_id, role:shg_security_roles(id, name)";

export async function GET() {
  const { error } = await requirePermission("roles");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_admin_users")
    .select(ADMIN_ROW_COLUMNS)
    .order("created_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: "Error al obtener los administradores." }, { status: 500 });
  return NextResponse.json({ data });
}

// ─── POST /api/admin/admins ──────────────────────────────────────────────────
// Grants admin access to an existing shg_users account — email/name are
// pulled from that account (never typed here), and no password is set on
// this row: the admin authenticates with that account's own password from
// then on (see app/api/auth/admin-sign-in/route.ts).

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("roles");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = createAdminUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();

  const { data: user } = await admin
    .from("shg_users")
    .select("id, email, name")
    .eq("id", parsed.data.user_id)
    .maybeSingle();
  if (!user) return NextResponse.json({ error: "No se encontró ese usuario." }, { status: 404 });

  const { data, error: insertError } = await admin
    .from("shg_admin_users")
    .insert({
      email: user.email.toLowerCase(),
      name: user.name ?? user.email,
      role_id: parsed.data.role_id,
      user_id: user.id,
      password_hash: null,
    })
    .select(ADMIN_ROW_COLUMNS)
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Ese usuario ya es administrador." }, { status: 422 });
    }
    return NextResponse.json({ error: "No se pudo crear el administrador." }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
