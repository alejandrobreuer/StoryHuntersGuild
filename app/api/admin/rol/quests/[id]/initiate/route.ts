import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// DM "Starts" an available quest — participants are every character with an
// APPROVED application (reviewed one by one via
// /api/admin/rol/quests/[id]/applications/[appId]), not a manual pick
// anymore. Any application still pending at this point is auto-rejected —
// starting closes the window to apply. Never reverts to 'available'.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data: quest } = await admin.from("shg_rol_quest").select("status").eq("id", params.id).maybeSingle();
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  if (quest.status !== "available") {
    return NextResponse.json({ error: "Esta misión ya fue iniciada." }, { status: 422 });
  }

  const { data: approved } = await admin
    .from("shg_rol_quest_application")
    .select("character_id")
    .eq("quest_id", params.id)
    .eq("status", "approved");

  if (!approved || approved.length === 0) {
    return NextResponse.json({ error: "No hay personajes aprobados para esta misión." }, { status: 422 });
  }

  const { error: participantsError } = await admin
    .from("shg_rol_quest_participant")
    .insert(approved.map((a) => ({ quest_id: params.id, character_id: a.character_id })));
  if (participantsError) return NextResponse.json({ error: "No se pudo asignar a los personajes." }, { status: 500 });

  await admin
    .from("shg_rol_quest_application")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("quest_id", params.id)
    .eq("status", "pending");

  const { data, error: updateError } = await admin
    .from("shg_rol_quest")
    .update({ status: "active" })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo iniciar la misión." }, { status: 500 });
  return NextResponse.json({ data });
}
