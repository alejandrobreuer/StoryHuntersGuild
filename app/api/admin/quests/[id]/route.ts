import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questSchema } from "@/lib/validation/quests";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("quests");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_quests")
    .update({
      ...parsed.data,
      badge_id: parsed.data.badge_id || null,
      game_id: parsed.data.game_id || null,
      max_participants: parsed.data.max_participants || null,
      required_turn_ins: parsed.data.required_turn_ins || null,
      goal_count: parsed.data.goal_count || null,
      starts_at: parsed.data.starts_at || null,
      ends_at: parsed.data.ends_at || null,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar la misión." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("quests");
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_quests").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar la misión." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
