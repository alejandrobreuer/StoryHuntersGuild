import { randomBytes } from "crypto";

// 9 random bytes → exactly 12 base64url characters ([A-Za-z0-9_-]). Never a
// sequential id: a printed card's token is the only thing standing between
// a passer-by and a free mission claim, so it has to be unguessable.
export function generateQrToken(): string {
  return randomBytes(9).toString("base64url");
}

/** Cheap shape check before hitting the DB with whatever was in the URL. */
export function isWellFormedQrToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{8,32}$/.test(token);
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** The absolute URL printed into a mission card's QR. */
export function missionClaimUrl(token: string): string {
  return `${baseUrl()}/m/${token}`;
}

/** The absolute URL in an event's entrance check-in QR. */
export function checkinUrl(token: string): string {
  return `${baseUrl()}/checkin/${token}`;
}
