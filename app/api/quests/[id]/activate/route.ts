import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questActivationSchema } from "@/lib/validation/quests";

// ─── POST /api/quests/[id]/activate ─────────────────────────────────────────
// Self-service: a player declares they're working on a mission during a live
// event. Doesn't grant anything — a Guild Attendant still confirms the real
// completion (see /api/admin/quests/[id]/complete). Idempotent: activating
// an already-activated (or already turned-in) mission just returns as-is.

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
    admin.from("shg_quests").select("id, status").eq("id", params.id).maybeSingle(),
    admin.from("shg_quest_events").select("quest_id").eq("quest_id", params.id).eq("event_id", eventId).maybeSingle(),
    admin.from("shg_events").select("started_at, ended_at").eq("id", eventId).maybeSingle(),
  ]);

  if (!quest || quest.status !== "active") return NextResponse.json({ error: "Misión no disponible." }, { status: 404 });
  if (!link) return NextResponse.json({ error: "Esta misión no está asignada a este evento." }, { status: 422 });
  if (!event || !event.started_at || event.ended_at) {
    return NextResponse.json({ error: "Este evento no está en curso." }, { status: 422 });
  }

  const { error: upsertError } = await admin
    .from("shg_quest_activations")
    .upsert(
      { quest_id: params.id, event_id: eventId, user_id: user.id },
      { onConflict: "quest_id,event_id,user_id", ignoreDuplicates: true }
    );

  if (upsertError) return NextResponse.json({ error: "No se pudo activar la misión." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
