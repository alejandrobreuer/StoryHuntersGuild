// One-time script — mints the SHG_SERVICE_ROLE_JWT env var.
// Run locally: node scripts/mint-service-jwt.mjs "<your Supabase project's JWT secret>"
// Get that secret from: Supabase dashboard -> Settings -> API -> JWT Secret.
// This script never sends the secret anywhere — it only signs a token locally.

import { SignJWT } from "jose";

const jwtSecret = process.argv[2];
if (!jwtSecret) {
  console.error("Usage: node scripts/mint-service-jwt.mjs \"<Supabase project JWT secret>\"");
  process.exit(1);
}

const secret = new TextEncoder().encode(jwtSecret);
const token = await new SignJWT({ role: "shg_service" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("10y")
  .sign(secret);

console.log("\nSHG_SERVICE_ROLE_JWT=" + token + "\n");
console.log("Paste the line above into .env.local (and into your Vercel project's env vars).");
