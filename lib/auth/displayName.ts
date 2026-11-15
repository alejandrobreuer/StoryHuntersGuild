import { setNameSchema } from "@/lib/validation/auth";
import { containsBlockedLanguage } from "@/lib/moderation/nameFilter";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type DisplayNameCheck =
  | { ok: true; name: string }
  | { ok: false; error: string; status: number };

/**
 * The rules every player name goes through: format (setNameSchema), the
 * blocked-words filter, and unique across accounts (case-insensitive).
 * `excludeUserId` is the account being renamed, so its own name doesn't
 * count as taken. Shared by /api/auth/set-name, the first-password page and
 * the admin "add person to event" route.
 */
export async function checkDisplayName(admin: Admin, raw: unknown, excludeUserId?: string): Promise<DisplayNameCheck> {
  const parsed = setNameSchema.safeParse({ name: raw });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nombre inválido.", status: 422 };
  }
  const name = parsed.data.name;

  if (containsBlockedLanguage(name)) {
    return { ok: false, error: "Ese nombre no está permitido.", status: 422 };
  }

  let query = admin.from("shg_users").select("id").ilike("name", name);
  if (excludeUserId) query = query.neq("id", excludeUserId);
  const { data: existing } = await query.limit(1).maybeSingle();
  if (existing) {
    return { ok: false, error: "Ese nombre ya está en uso por otro aventurero.", status: 409 };
  }

  return { ok: true, name };
}
