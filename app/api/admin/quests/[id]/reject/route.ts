import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questRejectSchema } from "@/lib/validation/quests";

// ─── POST /api/admin/quests/[id]/reject ─────────────────────────────────────
// Denies a turned-in mission for Individual, Event, or Guild types. No
// reward is granted; the activation is marked "rejected" so the player can
// try again (re-activate for Individual, turn in again for Event/Guild).
// This is the only path that produces a "failed" outcome for these types.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("quests");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questRejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: quest } = await admin.from("shg_quests").select("id, title, type").eq("id", params.id).maybeSingle();
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  if (quest.type === "group") {
    return NextResponse.json({ error: "Las misiones de grupo se rechazan desde su grupo." }, { status: 400 });
  }

  const { userId, eventId } = parsed.data;

  let query = admin
    .from("shg_quest_activations")
    .update({ status: "rejected" })
    .eq("quest_id", params.id).eq("user_id", userId).eq("status", "turned_in");
  query = eventId ? query.eq("event_id", eventId) : query.is("event_id", null);
  const { data: updated, error: updateError } = await query.select("id").maybeSingle();

  if (updateError) return NextResponse.json({ error: "No se pudo rechazar la entrega." }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "No hay una entrega pendiente para rechazar." }, { status: 404 });

  const [{ data: userRow }, { data: eventRow }] = await Promise.all([
    admin.from("shg_users").select("name, email").eq("id", userId).maybeSingle(),
    eventId ? admin.from("shg_events").select("title").eq("id", eventId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  await admin.from("shg_quest_history").insert({
    quest_id: params.id, quest_title: quest.title, quest_type: quest.type,
    event_id: eventId || null, event_title: eventRow?.title ?? null,
    user_id: userId, user_label: userRow?.name || userRow?.email || "Aventurero",
    outcome: "failed", awarded_xp: 0, awarded_rp: 0,
  });

  return NextResponse.json({ ok: true });
}
