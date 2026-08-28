import { NextRequest, NextResponse } from "next/server";
import { getAdminUser, requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCharacterSheet } from "@/app/FU/lib/derivedStats";
import type { FUCharacter } from "@/app/FU/lib/types";

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
    .select("character:shg_rol_character(id, owner_id, name, portrait_url)")
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

  // Vote tally for leader election — only meaningful while active and
  // unresolved; every participant (not just the caller) can see live counts.
  let leaderVotes: { voter_character_id: string; candidate_character_id: string }[] = [];
  if (quest.status === "active" && !quest.leader_character_id && (myCharacter || isRolAdmin)) {
    const { data: votes } = await admin
      .from("shg_rol_quest_leader_vote")
      .select("voter_character_id, candidate_character_id")
      .eq("quest_id", params.id);
    leaderVotes = votes ?? [];
  }

  const isLeader = Boolean(myCharacter && quest.leader_character_id === myCharacter.id);

  // Features the leader can currently allocate reward supplies to: not
  // already unlocked, and eligible at the guild's CURRENT Guild Status
  // (mirrors the eligibility check inside shg_rol_allocate_quest_supplies()).
  let eligibleFeatures: { id: string; title: string; cost_supplies: number; supplies_allocated: number }[] = [];
  if (quest.status === "accepted" && (isLeader || isRolAdmin)) {
    const [{ data: guild }, { data: statuses }, { data: features }] = await Promise.all([
      admin.from("shg_rol_guild").select("current_guild_status_id").limit(1).maybeSingle(),
      admin.from("shg_rol_guild_status").select("id, sort_order"),
      admin.from("shg_rol_guild_feature").select("id, title, guild_status_id, cost_supplies, supplies_allocated, unlocked"),
    ]);
    const statusSort = new Map((statuses ?? []).map((s) => [s.id, s.sort_order]));
    const currentSort = guild?.current_guild_status_id ? statusSort.get(guild.current_guild_status_id) : undefined;
    eligibleFeatures = (features ?? [])
      .filter((f) => !f.unlocked)
      .filter((f) => !f.guild_status_id || (currentSort !== undefined && (statusSort.get(f.guild_status_id) ?? Infinity) <= currentSort))
      .map((f) => ({ id: f.id, title: f.title, cost_supplies: f.cost_supplies, supplies_allocated: f.supplies_allocated }));
  }

  // Each thread is a single document now (see 033_shg_rol_quest_note_
  // document.sql) — at most one row per visibility (+character for private).
  let publicNote: { content: string; updated_at: string } | null = null;
  let myNote: { content: string; updated_at: string } | null = null;
  if (myCharacter || isRolAdmin) {
    const { data: notes } = await admin
      .from("shg_rol_quest_note")
      .select("visibility, character_id, content, updated_at")
      .eq("quest_id", params.id);

    publicNote = (notes ?? []).find((n) => n.visibility === "public") ?? null;
    if (myCharacter) {
      myNote = (notes ?? []).find((n) => n.visibility === "player_private" && n.character_id === myCharacter.id) ?? null;
    }
  }

  // Full sheet for the mission page's embedded CharacterSheet — the viewer's
  // own character only (not every participant's). Characters created before
  // the cockpit-sheet rework are missing fields added since — backfill on
  // read so the embedded sheet doesn't crash on them.
  let myCharacterSheet: { sheet_data: FUCharacter; portrait_url: string | null; full_body_url: string | null } | null = null;
  if (myCharacter) {
    const { data: full } = await admin
      .from("shg_rol_character")
      .select("sheet_data, portrait_url, full_body_url")
      .eq("id", myCharacter.id)
      .maybeSingle();
    myCharacterSheet = full ? { ...full, sheet_data: normalizeCharacterSheet(full.sheet_data as FUCharacter) } : null;
  }

  return NextResponse.json({
    data: {
      quest,
      participants: allParticipants.map((c) => ({ id: c.id, name: c.name, portrait_url: c.portrait_url })),
      myCharacterId: myCharacter?.id ?? null,
      myCharacterSheet,
      myApplication,
      leaderVotes,
      isLeader,
      eligibleFeatures,
      publicNote,
      myNote,
    },
  });
}
