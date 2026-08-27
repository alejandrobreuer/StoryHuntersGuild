import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Only the elected leader can turn in — closes the mission to further
// leader-vote changes implicitly (voting already requires status='active').
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const { data: quest } = await admin
    .from("shg_rol_quest")
    .select("status, leader_character_id, leader:shg_rol_character(owner_id)")
    .eq("id", params.id)
    .maybeSingle();
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  if (quest.status !== "active") {
    return NextResponse.json({ error: "Esta misión no está activa." }, { status: 422 });
  }
  const leader = Array.isArray(quest.leader) ? quest.leader[0] : quest.leader;
  if (!quest.leader_character_id || !leader || leader.owner_id !== user.id) {
    return NextResponse.json({ error: "Solo el líder de la misión puede entregarla." }, { status: 403 });
  }

  const { data, error: updateError } = await admin
    .from("shg_rol_quest")
    .update({ status: "turned_in", turned_in_at: new Date().toISOString(), turned_in_by: quest.leader_character_id })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo entregar la misión." }, { status: 500 });
  return NextResponse.json({ data });
}
