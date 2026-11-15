import crypto from "crypto";
import type { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/features";
import { levelForXp } from "@/lib/gamification/progression";
import type { ShgBenefit, ShgInviteCode, ShgRank } from "@/types/database";

// ─── Benefits (server side) ─────────────────────────────────────────────────
// Which benefits a player has is worked out here from their rp/xp, never
// stored: they keep every benefit whose rank (RP) or level (XP) they've
// reached. Rank benefits only count while the "ranks" feature is on, level
// ones while "progression" is. See 062_shg_benefits.sql for the tables.

type Admin = ReturnType<typeof createAdminClient>;

export type BenefitWithRank = ShgBenefit & { rank: Pick<ShgRank, "id" | "name" | "rp_required"> | null };

/** Current month as YYYY-MM in Buenos Aires time — what monthly limits count. */
export function currentPeriod(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit" })
    .formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}`;
}

/** End of the month after `period` (codes issued in May last through June). */
function endOfFollowingMonth(period: string): Date {
  const [y, m] = period.split("-").map(Number);
  // Month index m+1 (0-based) is two months on; its 1st at 02:59:59 UTC is
  // 23:59:59 Buenos Aires (UTC-3) on the last day of the following month.
  return new Date(Date.UTC(y, m + 1, 1, 2, 59, 59));
}

export async function loadBenefits(admin: Admin, { activeOnly = true } = {}): Promise<BenefitWithRank[]> {
  let query = admin.from("shg_benefits").select("*, rank:shg_ranks(id, name, rp_required)");
  if (activeOnly) query = query.eq("active", true);
  const { data } = await query;
  return ((data ?? []) as BenefitWithRank[]).map((b) => ({ ...b, rank: Array.isArray(b.rank) ? b.rank[0] ?? null : b.rank }));
}

export function isUnlocked(b: BenefitWithRank, user: { xp: number; rp: number }, flags: { ranks: boolean; progression: boolean }): boolean {
  if (b.unlock_type === "rank") return flags.ranks && !!b.rank && user.rp >= b.rank.rp_required;
  return flags.progression && b.min_level != null && levelForXp(user.xp) >= b.min_level;
}

export interface PlayerBenefits {
  all:      BenefitWithRank[];
  unlocked: BenefitWithRank[];
  user:     { xp: number; rp: number };
}

export async function playerBenefits(admin: Admin, userId: string): Promise<PlayerBenefits> {
  const [flags, all, { data: user }] = await Promise.all([
    getFeatureFlags(),
    loadBenefits(admin),
    admin.from("shg_users").select("xp, rp").eq("id", userId).maybeSingle(),
  ]);
  const stats = { xp: user?.xp ?? 0, rp: user?.rp ?? 0 };
  const visible = all.filter((b) => (b.unlock_type === "rank" ? flags.ranks : flags.progression));
  return { all: visible, unlocked: visible.filter((b) => isUnlocked(b, stats, flags)), user: stats };
}

// ─── Rank-only events ───────────────────────────────────────────────────────

/** The rank an event requires that this player doesn't have yet, or null if
 * they may book. Ignored while the "ranks" feature is off. */
export async function missingEventRank(
  admin: Admin, minRankId: string | null, userId: string | null,
): Promise<Pick<ShgRank, "id" | "name" | "rp_required"> | null> {
  if (!minRankId) return null;
  const flags = await getFeatureFlags();
  if (!flags.ranks) return null;
  const { data: rank } = await admin.from("shg_ranks").select("id, name, rp_required").eq("id", minRankId).maybeSingle();
  if (!rank) return null;
  if (!userId) return rank;
  const { data: user } = await admin.from("shg_users").select("rp").eq("id", userId).maybeSingle();
  return (user?.rp ?? 0) >= rank.rp_required ? null : rank;
}

// ─── Booking-time benefits ──────────────────────────────────────────────────

export interface LimitedBenefit { benefitId: string; remaining: number; monthly: boolean; limit: number }

export interface BookingBenefits {
  /** Best event_discount percent, 0 if none — applies to the booker's own ticket. */
  memberDiscountPercent: number;
  twoForOne:   LimitedBenefit[];
  freeTickets: LimitedBenefit[];
}

export async function bookingBenefits(admin: Admin, userId: string): Promise<BookingBenefits> {
  const { unlocked } = await playerBenefits(admin, userId);
  const memberDiscountPercent = Math.max(0, ...unlocked.filter((b) => b.kind === "event_discount").map((b) => b.percent ?? 0));

  const limited = unlocked.filter((b) => b.kind === "monthly_2x1" || b.kind === "free_tickets");
  const period = currentPeriod();
  const { data: uses } = limited.length > 0
    ? await admin.from("shg_benefit_uses").select("benefit_id, period").eq("user_id", userId).in("benefit_id", limited.map((b) => b.id))
    : { data: [] as { benefit_id: string; period: string }[] };

  const remainingFor = (b: BenefitWithRank): LimitedBenefit => {
    const monthly = b.kind === "monthly_2x1";
    const used = (uses ?? []).filter((u) => u.benefit_id === b.id && (!monthly || u.period === period)).length;
    const limit = b.quantity ?? 0;
    return { benefitId: b.id, remaining: Math.max(0, limit - used), monthly, limit };
  };

  return {
    memberDiscountPercent,
    twoForOne:   limited.filter((b) => b.kind === "monthly_2x1").map(remainingFor).filter((r) => r.remaining > 0),
    freeTickets: limited.filter((b) => b.kind === "free_tickets").map(remainingFor).filter((r) => r.remaining > 0),
  };
}

/** Claims `count` uses spread over `options` (in order). Returns false — with
 * nothing claimed — if they ran out in the meantime. */
export async function claimBenefitUses(
  admin: Admin, userId: string, bookingId: string, options: LimitedBenefit[], count: number,
): Promise<boolean> {
  const period = currentPeriod();
  let left = count;
  for (const o of options) {
    if (left <= 0) break;
    const take = Math.min(left, o.remaining);
    if (take <= 0) continue;
    const { data: ok } = await admin.rpc("shg_claim_benefit_uses", {
      p_user_id: userId, p_benefit_id: o.benefitId, p_booking_id: bookingId,
      p_period: period, p_monthly: o.monthly, p_limit: o.limit, p_count: take,
    });
    if (!ok) break;
    left -= take;
  }
  if (left > 0) {
    await admin.from("shg_benefit_uses").delete().eq("booking_id", bookingId);
    return false;
  }
  return true;
}

/** Per-benefit state line for the profile: what's left, or whether a custom
 * one has been handed over. Keyed by benefit id; kinds with nothing to
 * count (permanent discount, bonus) are left out. */
export async function benefitStatuses(admin: Admin, userId: string, unlocked: BenefitWithRank[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = unlocked.map((b) => b.id);
  if (ids.length === 0) return out;
  const period = currentPeriod();
  const [{ data: uses }, { data: delivered }] = await Promise.all([
    admin.from("shg_benefit_uses").select("benefit_id, period").eq("user_id", userId).in("benefit_id", ids),
    admin.from("shg_benefit_deliveries").select("benefit_id").eq("user_id", userId).in("benefit_id", ids),
  ]);
  const deliveredIds = new Set((delivered ?? []).map((d) => d.benefit_id));
  const left = (n: number, suffix: string) => (n <= 0 ? `Ya los usaste${suffix}` : `Te ${n === 1 ? "queda 1" : `quedan ${n}`}${suffix}`);
  for (const b of unlocked) {
    if (b.kind === "custom") {
      out.set(b.id, deliveredIds.has(b.id) ? "Entregado" : "Pendiente de retirar: pedíselo al equipo");
    } else if (b.kind === "monthly_2x1") {
      const used = (uses ?? []).filter((u) => u.benefit_id === b.id && u.period === period).length;
      out.set(b.id, left((b.quantity ?? 0) - used, " este mes"));
    } else if (b.kind === "free_tickets") {
      const used = (uses ?? []).filter((u) => u.benefit_id === b.id).length;
      out.set(b.id, left((b.quantity ?? 0) - used, ""));
    } else if (b.kind === "event_discount" || b.kind === "bonus_rewards") {
      out.set(b.id, "Se aplica solo");
    }
  }
  return out;
}

// ─── Bonus XP/RP ────────────────────────────────────────────────────────────

/** Adds the player's best bonus_rewards percent to positive XP/RP awards
 * (attendance and missions), XP and RP each taking the best benefit that
 * applies to them. Manual corrections by staff don't go through this. */
export async function withRewardBonus(admin: Admin, userId: string, xp: number, rp: number): Promise<{ xp: number; rp: number }> {
  if (xp <= 0 && rp <= 0) return { xp, rp };
  const { unlocked } = await playerBenefits(admin, userId);
  const bonuses = unlocked.filter((b) => b.kind === "bonus_rewards");
  const best = (target: "xp" | "rp") =>
    Math.max(0, ...bonuses.filter((b) => b.applies_to === target || b.applies_to === "both").map((b) => b.percent ?? 0));
  const boost = (n: number, pct: number) => (n > 0 && pct > 0 ? Math.round(n * (1 + pct / 100)) : n);
  return { xp: boost(xp, best("xp")), rp: boost(rp, best("rp")) };
}

// ─── Invite codes ───────────────────────────────────────────────────────────

function randomInviteCode(): string {
  // No 0/O/1/I so codes read aloud or copied by hand don't get mixed up.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  return "INV-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Makes sure this month's codes exist for each unlocked monthly_invites
 * benefit, then returns the player's codes that are still worth showing
 * (unexpired, or used — so they see who used theirs). */
export async function ensureInviteCodes(admin: Admin, userId: string, unlocked: BenefitWithRank[]): Promise<ShgInviteCode[]> {
  const period = currentPeriod();
  const inviteBenefits = unlocked.filter((b) => b.kind === "monthly_invites");

  if (inviteBenefits.length > 0) {
    const { data: existing } = await admin
      .from("shg_invite_codes").select("benefit_id")
      .eq("owner_id", userId).eq("period", period).in("benefit_id", inviteBenefits.map((b) => b.id));
    for (const b of inviteBenefits) {
      const have = (existing ?? []).filter((c) => c.benefit_id === b.id).length;
      for (let i = have; i < (b.quantity ?? 0); i++) {
        // A clash on the unique code index just retries with a new one.
        for (let attempt = 0; attempt < 3; attempt++) {
          const { error } = await admin.from("shg_invite_codes").insert({
            code: randomInviteCode(), owner_id: userId, benefit_id: b.id, period,
            discount_percent: b.percent ?? 100, expires_at: endOfFollowingMonth(period).toISOString(),
          });
          if (!error || error.code !== "23505") break;
        }
      }
    }
  }

  const { data: codes } = await admin
    .from("shg_invite_codes").select("*")
    .eq("owner_id", userId)
    .or(`expires_at.gt.${new Date().toISOString()},used_at.not.is.null`)
    .order("created_at", { ascending: false })
    .limit(30);
  return (codes ?? []) as ShgInviteCode[];
}

export type InviteCheck =
  | { ok: true; invite: Pick<ShgInviteCode, "id" | "code" | "discount_percent" | "owner_id"> }
  | { ok: false; error: string };

/** Whether `userId` may use invite code `code` right now (doesn't claim it). */
export async function checkInviteCode(admin: Admin, code: string, userId: string | null): Promise<InviteCheck | null> {
  const { data: invite } = await admin
    .from("shg_invite_codes")
    .select("id, code, discount_percent, owner_id, expires_at, used_at")
    .ilike("code", code)
    .maybeSingle();
  if (!invite) return null;
  if (invite.used_at) return { ok: false, error: "Esa invitación ya fue utilizada." };
  if (new Date(invite.expires_at) <= new Date()) return { ok: false, error: "Esa invitación ya venció." };
  if (!userId) return { ok: false, error: "Iniciá sesión para usar una invitación." };
  if (invite.owner_id === userId) return { ok: false, error: "No podés usar tu propia invitación: compartila con alguien que todavía no vino." };

  const { count } = await admin
    .from("shg_bookings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["pending", "approved"]);
  if ((count ?? 0) > 0) return { ok: false, error: "Las invitaciones son para quienes vienen por primera vez." };

  return { ok: true, invite };
}
