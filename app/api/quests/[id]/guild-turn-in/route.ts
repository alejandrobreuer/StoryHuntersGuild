import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/quests/[id]/guild-turn-in ────────────────────────────────────
// Self-service, Guild missions only. No eventId — Guild missions aren't tied
// to any event, just a starts_at/ends_at window. Repeatable: once a Guild
// Attendant confirms this submission (see admin complete/route.ts), the
// pending row is cleared and the player can submit again.

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();

  const { data: quest } = await admin
    .from("shg_quests")
    .select("id, status, type, starts_at, ends_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!quest || quest.status !== "active" || quest.type !== "guild") {
    return NextResponse.json({ error: "Misión no disponible." }, { status: 404 });
  }

  const now = new Date();
  if (!quest.starts_at || !quest.ends_at || now < new Date(quest.starts_at) || now > new Date(quest.ends_at)) {
    return NextResponse.json({ error: "Esta misión no está activa en este momento." }, { status: 422 });
  }

  const { data: pending } = await admin
    .from("shg_quest_activations")
    .select("id")
    .eq("quest_id", params.id).is("event_id", null).eq("user_id", user.id).eq("status", "turned_in")
    .maybeSingle();
  if (pending) {
    return NextResponse.json({ error: "Ya tenés una entrega esperando confirmación." }, { status: 409 });
  }

  const { error: insertError } = await admin.from("shg_quest_activations").insert({
    quest_id: params.id, event_id: null, user_id: user.id, status: "turned_in", turned_in_at: new Date().toISOString(),
  });
  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Ya tenés una entrega esperando confirmación." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo entregar la misión." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
