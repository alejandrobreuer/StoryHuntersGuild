import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MagicLinkPurpose } from "@/types/database";

const TOKEN_BYTES        = 32;
const RATE_LIMIT_WINDOW_MIN = 15;
const RATE_LIMIT_MAX     = 3;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates and stores a magic-link token, rate-limited per email. Returns
 * the RAW token (only ever placed in the emailed URL — the DB only ever
 * stores its hash) or null if the rate limit was hit.
 */
export async function createMagicLinkToken(
  email: string,
  purpose: MagicLinkPurpose,
  requestIp?: string
): Promise<string | null> {
  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString();
  const { count } = await admin
    .from("shg_magic_link_tokens")
    .select("id", { count: "exact", head: true })
    .eq("email", normalizedEmail)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= RATE_LIMIT_MAX) return null;

  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresMinutes = purpose === "admin" ? 10 : 15;

  const { error } = await admin.from("shg_magic_link_tokens").insert({
    email:        normalizedEmail,
    purpose,
    token_hash:   hashToken(rawToken),
    expires_at:   new Date(Date.now() + expiresMinutes * 60_000).toISOString(),
    requested_ip: requestIp ?? null,
  });

  if (error) return null;
  return rawToken;
}

export interface ConsumedToken {
  email:   string;
  purpose: MagicLinkPurpose;
}

/** Single-use token consumption — marks consumed atomically via the WHERE clause. */
export async function consumeMagicLinkToken(rawToken: string): Promise<ConsumedToken | null> {
  const admin = createAdminClient();
  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("shg_magic_link_tokens")
    .update({ consumed_at: now })
    .eq("token_hash", tokenHash)
    .is("consumed_at", null)
    .gt("expires_at", now)
    .select("email, purpose")
    .maybeSingle();

  if (error || !data) return null;
  return { email: data.email, purpose: data.purpose as MagicLinkPurpose };
}
