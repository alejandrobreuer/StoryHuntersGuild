import crypto from "crypto";

// Salted scrypt KDF for public-user passwords — no new dependency needed,
// `crypto` is already used for magic-link token hashing (lib/auth/magic-link.ts).
// Stored as "saltHex:hashHex" in shg_users.password_hash.

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err); else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES);
  const derived = await scrypt(password, salt);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const storedHash = Buffer.from(hashHex, "hex");
  const derived = await scrypt(password, salt);

  if (derived.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(derived, storedHash);
}
