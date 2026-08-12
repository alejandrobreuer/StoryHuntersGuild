import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questActivationSchema } from "@/lib/validation/quests";

// ─── POST /api/quests/[id]/activate ─────────────────────────────────────────
// Self-service: a player declares they're working on an Individual mission
// during a live event. Doesn't grant anything — a Guild Attendant still
// confirms the real completion (see /api/admin/quests/[id]/complete).
// Idempotent: activating an already-activated mission just returns as-is.
// Group missions use /group/join instead; Event and Guild missions skip the
// activate step entirely (assigned by default / turn in directly).

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
    admin.from("shg_quest_events").select("quest_id").eq("quest_id", params.id).eq("event_id", eventId).maybeSingle(),
    admin.from("shg_events").select("started_at, ended_at").eq("id", eventId).maybeSingle(),
  ]);

  if (!quest || quest.status !== "active") return NextResponse.json({ error: "Misión no disponible." }, { status: 404 });
  if (quest.type !== "individual") {
    return NextResponse.json({ error: "Esta misión no usa un paso de activación." }, { status: 400 });
  }
  if (!link) return NextResponse.json({ error: "Esta misión no está asignada a este evento." }, { status: 422 });
  if (!event || !event.started_at || event.ended_at) {
    return NextResponse.json({ error: "Este evento no está en curso." }, { status: 422 });
  }

  const [{ data: reward }, { data: existing }] = await Promise.all([
    admin.from("shg_quest_rewards").select("id").eq("quest_id", params.id).eq("user_id", user.id).maybeSingle(),
    admin.from("shg_quest_activations").select("status")
      .eq("quest_id", params.id).eq("event_id", eventId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (reward) return NextResponse.json({ error: "Ya completaste esta misión." }, { status: 422 });
  if (existing && existing.status !== "rejected") {
    return NextResponse.json({ ok: true });
  }

  const { error: upsertError } = await admin
    .from("shg_quest_activations")
    .upsert(
      { quest_id: params.id, event_id: eventId, user_id: user.id, status: "active", turned_in_at: null },
      { onConflict: "quest_id,event_id,user_id" }
    );

  if (upsertError) return NextResponse.json({ error: "No se pudo activar la misión." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
