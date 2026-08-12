import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questActivationSchema } from "@/lib/validation/quests";

// ─── POST /api/quests/[id]/turn-in ──────────────────────────────────────────
// Self-service, for Individual and Event missions only (Group missions turn
// in via /group/turn-in, Guild missions via /guild-turn-in).
//
// Individual and Event missions both work the same way here: this just
// flags the activation "turned_in" — a Guild Attendant still reviews it via
// /api/admin/quests/[id]/complete (which, for Event missions, is also where
// the shared achieve-at-threshold check now happens, since only
// admin-approved turn-ins count toward required_turn_ins).
//
// Event missions have no activate step (assigned to everyone by default) —
// turning in directly creates the "turned_in" record.

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

  const [{ data: quest }, { data: link }, { data: event }] = await Promise.all([
    admin.from("shg_quests").select("id, status, type").eq("id", params.id).maybeSingle(),
    admin.from("shg_quest_events").select("quest_id, status").eq("quest_id", params.id).eq("event_id", eventId).maybeSingle(),
    admin.from("shg_events").select("id, started_at, ended_at").eq("id", eventId).maybeSingle(),
  ]);

  if (!quest || quest.status !== "active") return NextResponse.json({ error: "Misión no disponible." }, { status: 404 });
  if (quest.type !== "individual" && quest.type !== "event") {
    return NextResponse.json({ error: "Esta misión no se entrega de esta forma." }, { status: 400 });
  }
  if (!link) return NextResponse.json({ error: "Esta misión no está asignada a este evento." }, { status: 422 });
  if (!event || !event.started_at || event.ended_at) {
    return NextResponse.json({ error: "Este evento no está en curso." }, { status: 422 });
  }
  if (quest.type === "event" && link.status !== "open") {
    return NextResponse.json({ error: "Esta misión de evento ya está cerrada." }, { status: 422 });
  }

  const { data: reward } = await admin
    .from("shg_quest_rewards").select("id").eq("quest_id", params.id).eq("user_id", user.id).maybeSingle();
  if (reward) return NextResponse.json({ error: "Ya completaste esta misión." }, { status: 422 });

  // For Event missions, an admin may have already approved (confirmed) this
  // turn-in — don't let a re-submit regress it back to pending review.
  if (quest.type === "event") {
    const { data: existing } = await admin
      .from("shg_quest_activations").select("status")
      .eq("quest_id", params.id).eq("event_id", eventId).eq("user_id", user.id).maybeSingle();
    if (existing?.status === "confirmed") return NextResponse.json({ ok: true });
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
