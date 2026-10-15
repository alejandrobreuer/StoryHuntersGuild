import crypto from "crypto";

// One-time password-reset tokens (see 046_shg_password_reset.sql). The raw
// token only ever travels in the emailed link; the DB keeps its SHA-256, so
// a plain hash (no salt/KDF) is enough — the token is 32 random bytes, not
// a guessable human secret.

const TOKEN_BYTES = 32;
export const RESET_TOKEN_TTL_MINUTES = 60;
/** Minimum gap between two reset emails for the same account. */
export const RESET_REQUEST_COOLDOWN_SECONDS = 60;

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
