import crypto from "crypto";

// Salted scrypt KDF for user/admin passwords — no new dependency needed,
// Node's built-in `crypto` covers it. Used for both shg_users.password_hash
// and shg_admin_users.password_hash. Stored as "saltHex:hashHex".

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
