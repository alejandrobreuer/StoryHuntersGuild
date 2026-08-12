import { createAdminClient } from "@/lib/supabase/admin";

// Guild missions live on the Home page only — never assignable to an event.
// An event may have at most one Event-type mission (its single shared goal).
export async function validateEventQuestLinks(
  admin: ReturnType<typeof createAdminClient>,
  questIds: string[]
): Promise<string | null> {
  if (questIds.length === 0) return null;

  const { data: quests } = await admin.from("shg_quests").select("id, type").in("id", questIds);
  const rows = quests ?? [];

  if (rows.some((q) => q.type === "guild")) {
    return "Las misiones de gremio no se asignan a eventos.";
  }
  if (rows.filter((q) => q.type === "event").length > 1) {
    return "Un evento solo puede tener una misión de evento.";
  }
  return null;
}
