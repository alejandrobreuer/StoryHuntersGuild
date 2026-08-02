import { SignJWT, jwtVerify } from "jose";
import type { ShgSessionPayload, ShgAdminSessionPayload } from "@/types/database";

function secretFor(kind: "public" | "admin"): Uint8Array {
  const raw = kind === "public" ? process.env.SESSION_SECRET : process.env.ADMIN_SESSION_SECRET;
  if (!raw) throw new Error(`Missing ${kind === "public" ? "SESSION_SECRET" : "ADMIN_SESSION_SECRET"} env var.`);
  return new TextEncoder().encode(raw);
}

export async function signPublicSession(payload: ShgSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretFor("public"));
}

export async function verifyPublicSession(token: string): Promise<ShgSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretFor("public"));
    if (payload.kind !== "public") return null;
    return payload as unknown as ShgSessionPayload;
  } catch {
    return null;
  }
}

export async function signAdminSession(payload: ShgAdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretFor("admin"));
}

export async function verifyAdminSession(token: string): Promise<ShgAdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretFor("admin"));
    if (payload.kind !== "admin") return null;
    return payload as unknown as ShgAdminSessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE       = "shg_session";
export const ADMIN_SESSION_COOKIE = "shg_admin_session";
