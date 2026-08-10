import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { setNameSchema } from "@/lib/validation/auth";
import { containsBlockedLanguage } from "@/lib/moderation/nameFilter";
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

  const parsed = setNameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const name = parsed.data.name;

  if (containsBlockedLanguage(name)) {
    return NextResponse.json({ error: "Ese nombre no está permitido." }, { status: 422 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("shg_users")
    .select("id")
    .ilike("name", name)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Ese nombre ya está en uso por otro aventurero." }, { status: 409 });
  }

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
