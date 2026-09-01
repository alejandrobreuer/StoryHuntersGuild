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
    admin.from("shg_rol_character").select("id, name").eq("owner_id", user.id),
  ]);

  if (availableErr) return NextResponse.json({ error: "Error al obtener las misiones." }, { status: 500 });

  const myCharacterIds = (myCharacters ?? []).map((c) => c.id);
  const myCharacterName = new Map((myCharacters ?? []).map((c) => [c.id, c.name]));

  // My own application (any status) per available quest, so the board can
  // show "postulado / aceptado / rechazado" instead of a bare Apply button.
  let myApplicationByQuest = new Map<string, { status: string; character_id: string; character_name: string }>();
  if (myCharacterIds.length > 0 && (available ?? []).length > 0) {
    const { data: applications } = await admin
      .from("shg_rol_quest_application")
      .select("quest_id, status, character_id")
      .in("quest_id", (available ?? []).map((q) => q.id))
      .in("character_id", myCharacterIds);

    myApplicationByQuest = new Map(
      (applications ?? []).map((a) => [a.quest_id, { status: a.status, character_id: a.character_id, character_name: myCharacterName.get(a.character_id) ?? "" }])
    );
  }

  // Everyone's *approved* application per available quest — "confirmed
  // participants" shown on the board before the DM has actually Started the
  // quest (real shg_rol_quest_participant rows only exist after that).
  let confirmedByQuest = new Map<string, { id: string; name: string; portrait_url: string | null }[]>();
  if ((available ?? []).length > 0) {
    const { data: approved } = await admin
      .from("shg_rol_quest_application")
      .select("quest_id, character:shg_rol_character(id, name, portrait_url)")
      .eq("status", "approved")
      .in("quest_id", (available ?? []).map((q) => q.id));

    confirmedByQuest = new Map();
    for (const row of approved ?? []) {
      const c = Array.isArray(row.character) ? row.character[0] : row.character;
      if (!c) continue;
      const list = confirmedByQuest.get(row.quest_id) ?? [];
      list.push({ id: c.id, name: c.name, portrait_url: c.portrait_url });
      confirmedByQuest.set(row.quest_id, list);
    }
  }

  const availableWithApplication = (available ?? []).map((q) => ({
    ...q,
    my_application: myApplicationByQuest.get(q.id) ?? null,
    confirmed_participants: confirmedByQuest.get(q.id) ?? [],
  }));

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

  return NextResponse.json({ data: { available: availableWithApplication, mine } });
}
