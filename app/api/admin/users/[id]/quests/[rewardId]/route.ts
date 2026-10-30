import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { revokeQuestReward } from "@/lib/quests/rewards";

// ─── DELETE /api/admin/users/[id]/quests/[rewardId] ─────────────────────────
// Takes a completed quest away: reverses its XP/RP and, unless another quest
// still grants it, its badge.

export async function DELETE(_req: Request, { params }: { params: { id: string; rewardId: string } }) {
  const { error } = await requirePermission("users");
  if (error) return error;

  const result = await revokeQuestReward(createAdminClient(), params.id, params.rewardId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
