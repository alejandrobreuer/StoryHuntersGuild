import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Guild history: every completed quest with its participants and rewards —
// a straight query, no separate table (quests never revert to 'available').
export async function GET() {
  const { error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_rol_quest")
    .select("*, participants:shg_rol_quest_participant(character:shg_rol_character(id, name))")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: "Error al obtener el historial." }, { status: 500 });

  const rows = (data ?? []).map((q) => ({
    ...q,
    participants: (q.participants ?? [])
      .map((p: { character: { id: string; name: string } | { id: string; name: string }[] | null }) =>
        Array.isArray(p.character) ? p.character[0] : p.character)
      .filter(Boolean),
  }));

  return NextResponse.json({ data: rows });
}
