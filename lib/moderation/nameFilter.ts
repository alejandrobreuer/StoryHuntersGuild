// Display-name moderation — a small curated blocklist (English + Spanish
// profanity/slurs), not an exhaustive service. Anything that slips through
// can still be corrected by staff from /admin/users, same trust model as
// every other admin-correctable field in this app.

const BLOCKED_TERMS = [
  // English
  "fuck", "shit", "bitch", "bastard", "asshole", "cunt", "whore", "slut",
  "nigger", "nigga", "faggot", "fag", "retard", "chink", "spic", "kike",
  "gook", "wetback", "coon", "tranny", "dyke",
  // Spanish
  "puta", "puto", "putos", "putas", "mierda", "cabron", "cabrona",
  "gilipollas", "pendejo", "pendeja", "maricon", "marica", "zorra",
  "hijueputa", "hijoputa", "hdp", "coño", "verga", "polla", "concha",
  "sudaca", "negrata", "puñetero",
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function containsBlockedLanguage(name: string): boolean {
  const normalized = normalize(name);
  const words = normalized.split(/\s+/).filter(Boolean);
  const compact = words.join("");
  return BLOCKED_TERMS.some((term) => words.includes(term) || compact.includes(term));
}
