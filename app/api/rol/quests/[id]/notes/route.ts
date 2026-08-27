import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { playerQuestNoteCreateSchema } from "@/lib/validation/rol";

// A player only ever has ONE player_private document per quest (their own
// thread) — visibility and character_id are resolved server-side, never
// trusted from the client. Saving overwrites it in place (explicit
// select-then-update-or-insert; see the admin notes route for why not a DB
// upsert).
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

  const { data: existing } = await admin
    .from("shg_rol_quest_note")
    .select("id")
    .eq("quest_id", params.id)
    .eq("visibility", "player_private")
    .eq("character_id", myCharacter.id)
    .maybeSingle();

  const now = new Date().toISOString();
  const row = existing
    ? await admin
        .from("shg_rol_quest_note")
        .update({ content: parsed.data.content, author_id: user.id, author_kind: "player", updated_at: now })
        .eq("id", existing.id)
        .select()
        .single()
    : await admin
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

  if (row.error) return NextResponse.json({ error: "No se pudo guardar la nota." }, { status: 500 });
  return NextResponse.json({ data: row.data }, { status: existing ? 200 : 201 });
}
