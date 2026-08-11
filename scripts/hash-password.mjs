// One-time helper to compute a password hash in the exact format
// lib/auth/password.ts expects ("saltHex:hashHex"), for setting a password
// directly via SQL — mainly to bootstrap the first admin account, since
// there's no self-serve sign-up for shg_admin_users.
//
// Usage:
//   node scripts/hash-password.mjs "your-new-password"
//
// Then paste the printed hash into the Supabase SQL editor:
//   update shg_admin_users set password_hash = '<paste-hash>' where email = 'you@example.com';

import crypto from "crypto";

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "your-new-password"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const salt = crypto.randomBytes(16);
crypto.scrypt(password, salt, 64, (err, derivedKey) => {
  if (err) throw err;
  console.log(`\npassword_hash:\n\n${salt.toString("hex")}:${derivedKey.toString("hex")}\n`);
});
