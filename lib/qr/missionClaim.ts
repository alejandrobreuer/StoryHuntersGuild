import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/features";
import { isWellFormedQrToken } from "@/lib/qr/tokens";
import { getQrWindowSettings, missionClaimWindow, windowState } from "@/lib/qr/settings";
import { recordAttendance } from "@/lib/qr/attendance";
import type { QuestType, QuestEventStatus } from "@/types/database";

type Admin = ReturnType<typeof createAdminClient>;

// ─── Mission QR claim (/m/[token]) ──────────────────────────────────────────
// Shared by the page (read-only: evaluateMissionClaim) and the POST that
// actually writes (claimMission), so both run the exact same checks, in the
// spec's order: token → active → window → login → the player's own state.
//
// What a successful claim writes is the same thing the web buttons write,
// so it lands in the existing approval queue untouched:
// - Individual / Event: a "turned_in" shg_quest_activations row (source qr)
//   — same row /api/quests/[id]/turn-in upserts.
// - Group: membership in a QR party (shg_quest_groups, source qr). Every
//   player at the table scans the same card and lands in the same forming
//   party; the host closes it from the admin QR tab, which turns it in, and
//   confirms it in the approval queue like any other party.

export type MissionClaimOutcome =
  | { kind: "invalid" }
  | { kind: "inactive" }
  | { kind: "not_open"; eventTitle: string; opensAt: string }
  | { kind: "closed"; eventTitle: string }
  | { kind: "login_required" }
  | { kind: "event_mission_closed"; questTitle: string; eventTitle: string }
  | { kind: "already_pending"; questTitle: string; eventTitle: string }
  | { kind: "already_completed"; questTitle: string }
  | { kind: "in_party"; questTitle: string; eventTitle: string; memberCount: number }
  | { kind: "ready"; questTitle: string; questType: QuestType; eventTitle: string }
  | { kind: "submitted"; questTitle: string; eventTitle: string }
  | { kind: "joined_party"; questTitle: string; eventTitle: string; memberCount: number };

interface ClaimContext {
  quest: { id: string; title: string; type: QuestType; max_participants: number | null };
  event: { id: string; title: string };
  linkStatus: QuestEventStatus;
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

async function loadContext(admin: Admin, token: string): Promise<ClaimContext | MissionClaimOutcome> {
  if (!isWellFormedQrToken(token)) return { kind: "invalid" };

  const { data: code } = await admin
    .from("shg_event_mission_codes")
    .select("active, quest:shg_quests(id, title, type, status, max_participants), event:shg_events(id, title, status, starts_at, ends_at)")
    .eq("token", token)
    .maybeSingle();
  if (!code) return { kind: "invalid" };

  const quest = one(code.quest as unknown as ClaimContext["quest"] & { status: string });
  const event = one(code.event as unknown as { id: string; title: string; status: string; starts_at: string; ends_at: string | null });
  if (!code.active || !quest || quest.status !== "active" || !event || event.status !== "published") {
    return { kind: "inactive" };
  }

  const [{ data: link }, features, settings] = await Promise.all([
    admin.from("shg_quest_events").select("status").eq("quest_id", quest.id).eq("event_id", event.id).maybeSingle(),
    getFeatureFlags(),
    getQrWindowSettings(admin),
  ]);
  // Mission detached from the event, or missions switched off site-wide.
  if (!link || !features.quests || quest.type === "guild") return { kind: "inactive" };

  const window = missionClaimWindow(event, settings);
  const state = windowState(window);
  if (state === "before") return { kind: "not_open", eventTitle: event.title, opensAt: window.opensAt.toISOString() };
  if (state === "after") return { kind: "closed", eventTitle: event.title };

  return {
    quest: { id: quest.id, title: quest.title, type: quest.type, max_participants: quest.max_participants },
    event: { id: event.id, title: event.title },
    linkStatus: link.status as QuestEventStatus,
  };
}

function isContext(v: ClaimContext | MissionClaimOutcome): v is ClaimContext {
  return "quest" in v;
}

/** The live (not completed / rejected) party this user is in for this mission at this event. */
async function findLiveParty(admin: Admin, ctx: ClaimContext, userId: string) {
  const { data: memberships } = await admin
    .from("shg_quest_group_members")
    .select("group:shg_quest_groups!inner(id, quest_id, event_id, status)")
    .eq("user_id", userId);
  for (const m of memberships ?? []) {
    const g = one(m.group as unknown as { id: string; quest_id: string; event_id: string; status: string });
    if (g && g.quest_id === ctx.quest.id && g.event_id === ctx.event.id && g.status !== "completed" && g.status !== "rejected") {
      return g;
    }
  }
  return null;
}

async function memberCount(admin: Admin, groupId: string): Promise<number> {
  const { count } = await admin
    .from("shg_quest_group_members").select("user_id", { count: "exact", head: true }).eq("group_id", groupId);
  return count ?? 0;
}

/** Where this player stands on this mission — or "ready" if a claim would go through. */
async function playerState(admin: Admin, ctx: ClaimContext, userId: string): Promise<MissionClaimOutcome> {
  const { quest, event } = ctx;

  const { data: reward } = await admin
    .from("shg_quest_rewards").select("id").eq("quest_id", quest.id).eq("user_id", userId).limit(1).maybeSingle();
  if (reward) return { kind: "already_completed", questTitle: quest.title };

  if (quest.type === "group") {
    const party = await findLiveParty(admin, ctx, userId);
    if (party?.status === "turned_in") return { kind: "already_pending", questTitle: quest.title, eventTitle: event.title };
    if (party) {
      return { kind: "in_party", questTitle: quest.title, eventTitle: event.title, memberCount: await memberCount(admin, party.id) };
    }
    return { kind: "ready", questTitle: quest.title, questType: quest.type, eventTitle: event.title };
  }

  const { data: activation } = await admin
    .from("shg_quest_activations").select("status")
    .eq("quest_id", quest.id).eq("event_id", event.id).eq("user_id", userId).maybeSingle();
  if (activation?.status === "confirmed") return { kind: "already_completed", questTitle: quest.title };
  if (activation?.status === "turned_in") return { kind: "already_pending", questTitle: quest.title, eventTitle: event.title };

  if (quest.type === "event" && ctx.linkStatus !== "open") {
    return { kind: "event_mission_closed", questTitle: quest.title, eventTitle: event.title };
  }
  return { kind: "ready", questTitle: quest.title, questType: quest.type, eventTitle: event.title };
}

/** Read-only — safe to run on page load (link previews, prefetch). */
export async function evaluateMissionClaim(token: string, userId: string | null): Promise<MissionClaimOutcome> {
  const admin = createAdminClient();
  const ctx = await loadContext(admin, token);
  if (!isContext(ctx)) return ctx;
  if (!userId) return { kind: "login_required" };
  return playerState(admin, ctx, userId);
}

/** Writes the claim. Idempotent: a repeat or a concurrent double-tap comes
 * back as already_pending / in_party, never as a second submission. */
export async function claimMission(token: string, user: { id: string; email: string }): Promise<MissionClaimOutcome> {
  const admin = createAdminClient();
  const ctx = await loadContext(admin, token);
  if (!isContext(ctx)) return ctx;

  const state = await playerState(admin, ctx, user.id);
  if (state.kind !== "ready") return state;

  const result = ctx.quest.type === "group"
    ? await joinQrParty(admin, ctx, user.id)
    : await turnIn(admin, ctx, user.id);

  if (result.kind === "submitted" || result.kind === "joined_party") {
    // A claim proves the player is here — keep attendance complete even if
    // they skipped the entrance QR.
    await recordAttendance(admin, ctx.event.id, user, "mission_claim").catch(() => undefined);
  }
  return result;
}

async function turnIn(admin: Admin, ctx: ClaimContext, userId: string): Promise<MissionClaimOutcome> {
  const { quest, event } = ctx;
  const now = new Date().toISOString();

  // An "active" (activated on the web) or "rejected" row is reused — the
  // unique (quest_id, event_id, user_id) means there is only ever one row.
  const { data: updated, error: updateError } = await admin
    .from("shg_quest_activations")
    .update({ status: "turned_in", turned_in_at: now, source: "qr" })
    .eq("quest_id", quest.id).eq("event_id", event.id).eq("user_id", userId)
    .in("status", ["active", "rejected"])
    .select("id");
  if (updateError) throw updateError;

  if (!updated || updated.length === 0) {
    const { error: insertError } = await admin.from("shg_quest_activations").insert({
      quest_id: quest.id, event_id: event.id, user_id: userId,
      status: "turned_in", turned_in_at: now, source: "qr",
    });
    if (insertError) {
      // Lost a race with a concurrent scan: report where things now stand.
      if (insertError.code === "23505") return playerState(admin, ctx, userId);
      throw insertError;
    }
  }
  return { kind: "submitted", questTitle: quest.title, eventTitle: event.title };
}

async function joinQrParty(admin: Admin, ctx: ClaimContext, userId: string): Promise<MissionClaimOutcome> {
  const { quest, event } = ctx;
  const cap = Math.max(quest.max_participants ?? 2, 2);

  // Oldest forming QR party with a free seat; a full table spills into a new one.
  const { data: forming } = await admin
    .from("shg_quest_groups")
    .select("id, members:shg_quest_group_members(count)")
    .eq("quest_id", quest.id).eq("event_id", event.id).eq("source", "qr").eq("status", "forming")
    .order("created_at", { ascending: true });

  let groupId = (forming ?? []).find((g) => {
    const c = (g.members as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
    return c < cap;
  })?.id as string | undefined;

  if (!groupId) {
    const { data: created, error: createError } = await admin
      .from("shg_quest_groups")
      .insert({ quest_id: quest.id, event_id: event.id, status: "forming", source: "qr" })
      .select("id")
      .single();
    if (createError || !created) throw createError ?? new Error("Could not create QR party.");
    groupId = created.id as string;
  }

  const { error: joinError } = await admin.from("shg_quest_group_members").insert({ group_id: groupId, user_id: userId });
  if (joinError) {
    if (joinError.code === "23505") return playerState(admin, ctx, userId);
    throw joinError;
  }
  return { kind: "joined_party", questTitle: quest.title, eventTitle: event.title, memberCount: await memberCount(admin, groupId) };
}
