import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questLeaderVoteSchema } from "@/lib/validation/rol";

// A participant casts (or changes) their vote for who leads the mission.
// Resolves automatically the moment every participant has voted: plurality
// wins outright; a tie is left for the DM to break by hand (PATCH
// /api/admin/rol/quests/[id]/leader).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questLeaderVoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();

  const { data: quest } = await admin.from("shg_rol_quest").select("status, leader_character_id").eq("id", params.id).maybeSingle();
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  if (quest.status !== "active") {
    return NextResponse.json({ error: "Esta misión no está activa." }, { status: 422 });
  }
  if (quest.leader_character_id) {
    return NextResponse.json({ error: "Ya se eligió un líder para esta misión." }, { status: 422 });
  }

  const { data: participantRows } = await admin
    .from("shg_rol_quest_participant")
    .select("character:shg_rol_character(id, owner_id)")
    .eq("quest_id", params.id);
  const participants = (participantRows ?? [])
    .map((p) => (Array.isArray(p.character) ? p.character[0] : p.character))
    .filter((c): c is { id: string; owner_id: string } => Boolean(c));

  const myCharacter = participants.find((c) => c.owner_id === user.id);
  if (!myCharacter) return NextResponse.json({ error: "No participás en esta misión." }, { status: 403 });
  if (!participants.some((c) => c.id === parsed.data.candidate_character_id)) {
    return NextResponse.json({ error: "Ese personaje no participa en esta misión." }, { status: 422 });
  }

  const { error: voteError } = await admin
    .from("shg_rol_quest_leader_vote")
    .upsert(
      { quest_id: params.id, voter_character_id: myCharacter.id, candidate_character_id: parsed.data.candidate_character_id, voted_at: new Date().toISOString() },
      { onConflict: "quest_id,voter_character_id" }
    );
  if (voteError) return NextResponse.json({ error: "No se pudo registrar el voto." }, { status: 500 });

  const { data: votes } = await admin
    .from("shg_rol_quest_leader_vote")
    .select("candidate_character_id")
    .eq("quest_id", params.id);

  if (votes && votes.length >= participants.length) {
    const tally = new Map<string, number>();
    for (const v of votes) tally.set(v.candidate_character_id, (tally.get(v.candidate_character_id) ?? 0) + 1);
    const maxVotes = Math.max(...Array.from(tally.values()));
    const leaders = Array.from(tally.entries()).filter(([, count]) => count === maxVotes).map(([id]) => id);
    if (leaders.length === 1) {
      await admin.from("shg_rol_quest").update({ leader_character_id: leaders[0] }).eq("id", params.id);
    }
  }

  return NextResponse.json({ ok: true });
}
