import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAdminUserSchema } from "@/lib/validation/admins";

export async function GET() {
  const { error } = await requirePermission("roles");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_admin_users")
    .select("id, email, name, is_active, created_at, last_login_at, role:shg_security_roles(id, name)")
    .order("created_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: "Error al obtener los administradores." }, { status: 500 });
  return NextResponse.json({ data });
}

// ─── POST /api/admin/admins ─────────────────────────────────────────────────
// Creates the account row only — same self-serve model as every other admin,
// they sign in themselves via /admin/login's magic link once added.

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
  const { data, error: insertError } = await admin
    .from("shg_admin_users")
    .insert({ email: parsed.data.email.trim().toLowerCase(), name: parsed.data.name, role_id: parsed.data.role_id })
    .select("id, email, name, is_active, created_at, last_login_at, role:shg_security_roles(id, name)")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Ya existe un administrador con ese email." }, { status: 422 });
    }
    return NextResponse.json({ error: "No se pudo crear el administrador." }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
