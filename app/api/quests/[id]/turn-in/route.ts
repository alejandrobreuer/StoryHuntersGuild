import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questActivationSchema } from "@/lib/validation/quests";

// ─── POST /api/quests/[id]/turn-in ──────────────────────────────────────────
// Self-service: a player says they finished the mission and it's ready for a
// Guild Attendant to confirm in person. Still doesn't grant anything itself
// — same reasoning as /activate.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questActivationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { eventId } = parsed.data;

  const { data: event } = await admin.from("shg_events").select("started_at, ended_at").eq("id", eventId).maybeSingle();
  if (!event || !event.started_at || event.ended_at) {
    return NextResponse.json({ error: "Este evento no está en curso." }, { status: 422 });
  }

  const { error: upsertError } = await admin
    .from("shg_quest_activations")
    .upsert(
      { quest_id: params.id, event_id: eventId, user_id: user.id, status: "turned_in", turned_in_at: new Date().toISOString() },
      { onConflict: "quest_id,event_id,user_id" }
    );

  if (upsertError) return NextResponse.json({ error: "No se pudo entregar la misión." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
