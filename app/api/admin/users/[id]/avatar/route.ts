import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAvatar, clearAvatar } from "@/lib/profile/avatar";

// ─── /api/admin/users/[id]/avatar ───────────────────────────────────────────
// Staff (users permission) replace or remove any player's profile picture,
// e.g. to take down an inappropriate one. Same rules as the player's own
// upload (lib/profile/avatar.ts).

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("users");
  if (error) return error;

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const result = await setAvatar(createAdminClient(), params.id, form.get("file"));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: { avatar_url: result.avatar_url } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("users");
  if (error) return error;

  const result = await clearAvatar(createAdminClient(), params.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: { avatar_url: null } });
}
