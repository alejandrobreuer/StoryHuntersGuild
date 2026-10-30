import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { userQuestGrantSchema } from "@/lib/validation/users";
import { grantQuestReward } from "@/lib/quests/rewards";

// ─── POST /api/admin/users/[id]/quests ──────────────────────────────────────
// Marks a quest as completed for this player by hand and grants its reward
// (XP, RP, badge) right away — for any quest type, as an admin override:
// Event and Group quests normally reward through turn-ins / their group.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user: adminUser, error } = await requirePermission("users");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = userQuestGrantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Elegí una misión." }, { status: 422 });

  const admin = createAdminClient();
  const [{ data: quest }, { data: target }] = await Promise.all([
    admin.from("shg_quests")
      .select("id, title, type, reward_xp, reward_rp, badge_id, max_completions_per_event")
      .eq("id", parsed.data.questId).maybeSingle(),
    admin.from("shg_users").select("id").eq("id", params.id).maybeSingle(),
  ]);
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

  const granted = await grantQuestReward(admin, adminUser.id, quest, params.id, parsed.data.eventId ?? null);
  if (!granted.ok) return NextResponse.json({ error: granted.error }, { status: granted.status });
  return NextResponse.json({ ok: true }, { status: 201 });
}
