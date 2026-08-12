import { NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/turn-ins ─────────────────────────────────────────────────
// Aggregates every pending turn-in across all mission types into one queue:
// shg_quest_activations rows (Individual/Event/Guild — Guild rows have
// event_id null) plus shg_quest_groups rows (Group), both status
// 'turned_in'. Confirming/rejecting still goes through each mission's
// existing endpoints — this is purely a read-side aggregation.

export async function GET() {
  const { error } = await requirePermissionAny(["quests", "turn_ins"]);
  if (error) return error;

  const admin = createAdminClient();
  const [{ data: activations, error: activationsErr }, { data: groups, error: groupsErr }] = await Promise.all([
    admin
      .from("shg_quest_activations")
      .select("id, quest_id, event_id, user_id, turned_in_at, quest:shg_quests(id, title, type, reward_xp, reward_rp), user:shg_users(id, email, name), event:shg_events(id, title)")
      .eq("status", "turned_in")
      .order("turned_in_at", { ascending: true }),
    admin
      .from("shg_quest_groups")
      .select("id, quest_id, event_id, turned_in_at, quest:shg_quests(id, title, reward_xp, reward_rp), event:shg_events(id, title), members:shg_quest_group_members(user_id, user:shg_users(id, email, name))")
      .eq("status", "turned_in")
      .order("turned_in_at", { ascending: true }),
  ]);

  if (activationsErr || groupsErr) {
    return NextResponse.json({ error: "Error al obtener las entregas pendientes." }, { status: 500 });
  }
  return NextResponse.json({ data: { activations, groups } });
}
