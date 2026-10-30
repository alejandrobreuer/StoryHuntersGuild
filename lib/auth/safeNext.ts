/**
 * Validates a `?next=` redirect target from the sign-in / sign-up pages, so
 * the parameter can't be used as an open redirect. Only same-site relative
 * paths pass: a single leading "/", never "//host" or "/\host" (both of
 * which browsers treat as another origin), and no scheme. Anything else
 * falls back to `fallback`.
 */
export function safeNext(raw: string | null | undefined, fallback = "/my-bookings"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(raw)) return fallback;
  return raw;
}

/** True for the QR claim / check-in pages — sign-in shows extra phone-scan help for these. */
export function isQrNext(next: string): boolean {
  return next.startsWith("/m/") || next.startsWith("/checkin/");
}

/** True for an event's booking form — sign-in/sign-up explain that booking needs an account. */
export function isBookingNext(next: string): boolean {
  return /^\/events\/[^/]+\/book$/.test(next);
}
