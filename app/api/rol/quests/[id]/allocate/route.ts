import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questSupplyAllocateSchema } from "@/lib/validation/rol";

// Only the mission's leader allocates its reward-supplies pool, and only to
// a feature eligible at the guild's CURRENT Guild Status that isn't already
// unlocked — enforced atomically in shg_rol_allocate_quest_supplies() (also
// re-checked here first for a clearer error message).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questSupplyAllocateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: quest } = await admin
    .from("shg_rol_quest")
    .select("status, leader_character_id, leader:shg_rol_character(owner_id)")
    .eq("id", params.id)
    .maybeSingle();
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });

  const leader = Array.isArray(quest.leader) ? quest.leader[0] : quest.leader;
  if (!quest.leader_character_id || !leader || leader.owner_id !== user.id) {
    return NextResponse.json({ error: "Solo el líder de la misión puede asignar suministros." }, { status: 403 });
  }

  const { data, error: rpcError } = await admin.rpc("shg_rol_allocate_quest_supplies", {
    p_quest_id: params.id,
    p_feature_id: parsed.data.feature_id,
    p_amount: parsed.data.amount,
  });

  if (rpcError) {
    return NextResponse.json({ error: "No se pudo asignar — revisá el cupo disponible y si la función sigue elegible." }, { status: 422 });
  }
  return NextResponse.json({ data });
}
