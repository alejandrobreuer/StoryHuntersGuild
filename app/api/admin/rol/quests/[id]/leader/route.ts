import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questLeaderSetSchema } from "@/lib/validation/rol";

// DM-only vote tally + manual override — used to break a tie (the vote
// resolves on its own otherwise, see /api/rol/quests/[id]/leader-vote) or to
// reassign the leader by hand at any point.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data: votes, error: dbErr } = await admin
    .from("shg_rol_quest_leader_vote")
    .select("voter_character_id, candidate_character_id")
    .eq("quest_id", params.id);

  if (dbErr) return NextResponse.json({ error: "Error al obtener los votos." }, { status: 500 });
  return NextResponse.json({ data: votes ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questLeaderSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: participant } = await admin
    .from("shg_rol_quest_participant")
    .select("character_id")
    .eq("quest_id", params.id)
    .eq("character_id", parsed.data.character_id)
    .maybeSingle();
  if (!participant) return NextResponse.json({ error: "Ese personaje no participa en esta misión." }, { status: 422 });

  const { data, error: updateError } = await admin
    .from("shg_rol_quest")
    .update({ leader_character_id: parsed.data.character_id })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo asignar el líder." }, { status: 500 });
  return NextResponse.json({ data });
}
