import { createAdminClient } from "@/lib/supabase/admin";
import type { FeatureFlagKey } from "@/types/database";

/**
 * Server-side read of every feature flag, keyed by flag key. Call this from
 * Server Components / route handlers wherever a gamification section needs
 * to check whether it should render — same "just fetch it server-side"
 * pattern as getSessionUser()/getAdminUser() in lib/auth/guard.ts.
 *
 * Fails open (all-true) on a DB error so a flags-table hiccup doesn't take
 * down the whole site — the admin toggle is a kill switch, not a gate that
 * should itself become a single point of failure.
 */
export async function getFeatureFlags(): Promise<Record<FeatureFlagKey, boolean>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("shg_feature_flags").select("key, enabled");

  const flags: Record<FeatureFlagKey, boolean> = {
    progression: true,
    quests: true,
    ranks: true,
    subscriptions: true,
    event_rewards: true,
  };

  if (error || !data) return flags;
  for (const row of data as { key: FeatureFlagKey; enabled: boolean }[]) {
    flags[row.key] = row.enabled;
  }
  return flags;
}
