import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAvatar, clearAvatar } from "@/lib/profile/avatar";

// ─── /api/profile/avatar ────────────────────────────────────────────────────
// The player's own profile picture. POST uploads/replaces it, DELETE removes
// it (the profile goes back to the rank emblem). See lib/profile/avatar.ts.

export async function POST(req: NextRequest) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const result = await setAvatar(createAdminClient(), user.id, form.get("file"));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: { avatar_url: result.avatar_url } });
}

export async function DELETE() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const result = await clearAvatar(createAdminClient(), user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: { avatar_url: null } });
}
