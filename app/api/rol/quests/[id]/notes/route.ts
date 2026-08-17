import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { playerQuestNoteCreateSchema } from "@/lib/validation/rol";

// A player can only ever post into their OWN player_private thread for a
// quest they're participating in — visibility and character_id are resolved
// server-side, never trusted from the client.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = playerQuestNoteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: participantRows } = await admin
    .from("shg_rol_quest_participant")
    .select("character:shg_rol_character(id, owner_id)")
    .eq("quest_id", params.id);

  const myCharacter = (participantRows ?? [])
    .map((p) => (Array.isArray(p.character) ? p.character[0] : p.character))
    .find((c) => c?.owner_id === user.id);

  if (!myCharacter) {
    return NextResponse.json({ error: "No participás en esta misión." }, { status: 403 });
  }

  const { data, error: insertError } = await admin
    .from("shg_rol_quest_note")
    .insert({
      quest_id: params.id,
      visibility: "player_private",
      character_id: myCharacter.id,
      author_id: user.id,
      author_kind: "player",
      content: parsed.data.content,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo guardar la nota." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
