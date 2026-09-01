import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The one quest (if any) this specific character is currently an "active"
 * participant of — powers the character sheet's notes drawer, which only
 * ever shows notes/check history for a character's live mission. Owner-only
 * (no admin bypass): this is a player-personal feature, not a DM tool — the
 * DM already has the full quest page for that.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const { data: character } = await admin.from("shg_rol_character").select("id, owner_id").eq("id", params.id).maybeSingle();
  if (!character) return NextResponse.json({ error: "Personaje no encontrado." }, { status: 404 });
  if (character.owner_id !== user.id) {
    return NextResponse.json({ error: "No tenés acceso a este personaje." }, { status: 403 });
  }

  const { data: participantRows } = await admin
    .from("shg_rol_quest_participant")
    .select("quest:shg_rol_quest(id, title, status)")
    .eq("character_id", params.id);

  const activeQuest = (participantRows ?? [])
    .map((p) => (Array.isArray(p.quest) ? p.quest[0] : p.quest))
    .find((q) => q?.status === "active") ?? null;

  return NextResponse.json({ data: activeQuest ? { id: activeQuest.id, title: activeQuest.title } : null });
}
