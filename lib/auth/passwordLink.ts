import { createAdminClient } from "@/lib/supabase/admin";
import { generateResetToken, RESET_TOKEN_TTL_MINUTES, RESET_REQUEST_COOLDOWN_SECONDS } from "@/lib/auth/passwordReset";
import { sendPasswordResetEmail } from "@/lib/email";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Emails a single-use link to /reset-password for this account. Any earlier
 * unused links are invalidated, and at most one email goes out per
 * RESET_REQUEST_COOLDOWN_SECONDS so it can't flood an inbox.
 *
 * "setup" is for an account that has no password yet (created from its
 * bookings — 057_shg_accounts_from_bookings.sql): same link, worded as
 * activating the account. Proving control of the inbox is what lets the
 * person claim it, so no shared or guessable password is ever involved.
 */
export async function sendPasswordLink(
  admin: Admin,
  user: { id: string; email: string; name: string | null },
  baseUrl: string,
  purpose: "reset" | "setup",
): Promise<void> {
  const { data: recent } = await admin
    .from("shg_password_reset_tokens")
    .select("created_at")
    .eq("user_id", user.id)
    .gt("created_at", new Date(Date.now() - RESET_REQUEST_COOLDOWN_SECONDS * 1000).toISOString())
    .limit(1)
    .maybeSingle();
  if (recent) return;

  const now = new Date();
  await admin
    .from("shg_password_reset_tokens")
    .update({ used_at: now.toISOString() })
    .eq("user_id", user.id)
    .is("used_at", null);

  const { token, tokenHash } = generateResetToken();
  const { error: insertError } = await admin.from("shg_password_reset_tokens").insert({
    user_id:    user.id,
    token_hash: tokenHash,
    expires_at: new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60_000).toISOString(),
  });
  if (insertError) {
    console.error("[password-link] token insert failed:", insertError);
    return;
  }

  await sendPasswordResetEmail({
    email:            user.email,
    name:             user.name,
    resetUrl:         `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`,
    expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    setup:            purpose === "setup",
  });
}
