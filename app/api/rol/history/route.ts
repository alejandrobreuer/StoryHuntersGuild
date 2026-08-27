import { NextResponse } from "next/server";
import { getAdminUser, requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

const GATE_FEATURE_TITLE = "Tablón de Anuncios";

interface HistoryQuestRow {
  [key: string]: unknown;
  participants: { character: { id: string; name: string } | { id: string; name: string }[] | null }[];
  supply_allocations: { amount: number; feature: { id: string; title: string } | { id: string; title: string }[] | null }[];
}

// Guild history: every completed quest with its participants, rewards, and
// supply allocations — a straight query, no separate table (quests never
// revert to 'available'). Hidden from players until the guild feature
// titled "Tablón de Anuncios" is unlocked — the DM (an admin holding the
// "rol" permission) always sees it, same convention as everywhere else.
export async function GET() {
  const { error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();

  const adminUser = await getAdminUser();
  const isRolAdmin = Boolean(adminUser?.permissions.rol);

  if (!isRolAdmin) {
    const { data: gate } = await admin
      .from("shg_rol_guild_feature")
      .select("unlocked")
      .eq("title", GATE_FEATURE_TITLE)
      .maybeSingle();
    if (!gate?.unlocked) {
      return NextResponse.json({ data: null, locked: true, gateFeatureTitle: GATE_FEATURE_TITLE });
    }
  }

  const { data, error: dbErr } = await admin
    .from("shg_rol_quest")
    .select(
      "*, participants:shg_rol_quest_participant(character:shg_rol_character(id, name)), " +
      "supply_allocations:shg_rol_quest_supply_allocation(amount, feature:shg_rol_guild_feature(id, title))"
    )
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: "Error al obtener el historial." }, { status: 500 });

  const rows = ((data ?? []) as unknown as HistoryQuestRow[]).map((q) => ({
    ...q,
    participants: (q.participants ?? [])
      .map((p) => (Array.isArray(p.character) ? p.character[0] : p.character))
      .filter((c): c is { id: string; name: string } => Boolean(c)),
    supply_allocations: (q.supply_allocations ?? [])
      .map((a) => {
        const feature = Array.isArray(a.feature) ? a.feature[0] : a.feature;
        return feature ? { amount: a.amount, feature_title: feature.title } : null;
      })
      .filter((a): a is { amount: number; feature_title: string } => Boolean(a)),
  }));

  return NextResponse.json({ data: rows, locked: false });
}
