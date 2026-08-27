import { NextRequest, NextResponse } from "next/server";
import { getAdminUser, requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const { data: quest } = await admin
    .from("shg_rol_quest")
    .select("*, location:shg_rol_location(id, name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });

  const adminUser = await getAdminUser();
  const isRolAdmin = Boolean(adminUser?.permissions.rol);

  const { data: participantRows } = await admin
    .from("shg_rol_quest_participant")
    .select("character:shg_rol_character(id, owner_id, name)")
    .eq("quest_id", params.id);
  const allParticipants = (participantRows ?? [])
    .map((p) => (Array.isArray(p.character) ? p.character[0] : p.character))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  // Which (if any) of the caller's own characters participate in this quest.
  const myCharacter = allParticipants.find((c) => c.owner_id === user.id) ?? null;

  if (quest.status !== "available" && !myCharacter && !isRolAdmin) {
    return NextResponse.json({ error: "No tenés acceso a esta misión." }, { status: 403 });
  }

  let myApplication: { id: string; status: string; character_id: string } | null = null;
  if (quest.status === "available") {
    const { data: myCharacters } = await admin.from("shg_rol_character").select("id").eq("owner_id", user.id);
    const myCharacterIds = (myCharacters ?? []).map((c) => c.id);
    if (myCharacterIds.length > 0) {
      const { data: application } = await admin
        .from("shg_rol_quest_application")
        .select("id, status, character_id")
        .eq("quest_id", params.id)
        .in("character_id", myCharacterIds)
        .maybeSingle();
      myApplication = application ?? null;
    }
  }

  let publicNotes: unknown[] = [];
  let myThread: unknown[] = [];
  if (myCharacter || isRolAdmin) {
    const { data: notes } = await admin
      .from("shg_rol_quest_note")
      .select("*")
      .eq("quest_id", params.id)
      .order("created_at", { ascending: true });

    publicNotes = (notes ?? []).filter((n) => n.visibility === "public");
    if (myCharacter) {
      myThread = (notes ?? []).filter((n) => n.visibility === "player_private" && n.character_id === myCharacter.id);
    }
  }

  return NextResponse.json({
    data: {
      quest,
      participants: allParticipants.map((c) => ({ id: c.id, name: c.name })),
      myCharacterId: myCharacter?.id ?? null,
      myApplication,
      publicNotes,
      myThread,
    },
  });
}
