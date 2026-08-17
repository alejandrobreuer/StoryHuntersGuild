import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// available quests are visible to everyone. active/completed quests are only
// visible to the caller if one of their own characters is a participant.
export async function GET() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();

  const [{ data: available, error: availableErr }, { data: myCharacters }] = await Promise.all([
    admin.from("shg_rol_quest").select("*").eq("status", "available").order("created_at", { ascending: false }),
    admin.from("shg_rol_character").select("id").eq("owner_id", user.id),
  ]);

  if (availableErr) return NextResponse.json({ error: "Error al obtener las misiones." }, { status: 500 });

  const myCharacterIds = (myCharacters ?? []).map((c) => c.id);
  let mine: unknown[] = [];
  if (myCharacterIds.length > 0) {
    const { data: participantRows } = await admin
      .from("shg_rol_quest_participant")
      .select("quest:shg_rol_quest(*)")
      .in("character_id", myCharacterIds);

    const seen = new Set<string>();
    mine = (participantRows ?? [])
      .map((p) => (Array.isArray(p.quest) ? p.quest[0] : p.quest))
      .filter((q): q is NonNullable<typeof q> => Boolean(q))
      .filter((q) => {
        if (seen.has(q.id)) return false;
        seen.add(q.id);
        return true;
      });
  }

  return NextResponse.json({ data: { available: available ?? [], mine } });
}
