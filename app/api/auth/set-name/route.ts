import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { checkDisplayName } from "@/lib/auth/displayName";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/auth/set-name ────────────────────────────────────────────────
// Self-service display-name change. Email stays the account's real
// identifier; this only touches the public-facing name shown on the
// profile and around the guild.

export async function POST(req: NextRequest) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const admin = createAdminClient();
  const check = await checkDisplayName(admin, (body as { name?: unknown } | null)?.name, user.id);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const name = check.name;

  const { data, error: updateError } = await admin
    .from("shg_users")
    .update({ name })
    .eq("id", user.id)
    .select("name")
    .single();

  if (updateError) {
    if (updateError.code === "23505") {
      return NextResponse.json({ error: "Ese nombre ya está en uso por otro aventurero." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el nombre." }, { status: 500 });
  }

  return NextResponse.json({ data });
}
