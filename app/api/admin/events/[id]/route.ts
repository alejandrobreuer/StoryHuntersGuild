import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventSchema } from "@/lib/validation/events";
import { validateEventQuestLinks } from "@/lib/quests/validateEventQuestLinks";

// ─── GET /api/admin/events/[id] ─────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  const admin = createAdminClient();
  const [{ data: event }, { data: eventGames }, { data: eventQuests }] = await Promise.all([
    admin.from("shg_events").select("*, venue:shg_venues(id, name)").eq("id", params.id).maybeSingle(),
    admin.from("shg_event_games").select("game_id").eq("event_id", params.id),
    admin.from("shg_quest_events").select("quest_id").eq("event_id", params.id),
  ]);

  if (!event) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  return NextResponse.json({
    data: {
      ...event,
      game_ids: (eventGames ?? []).map((g) => g.game_id),
      quest_ids: (eventQuests ?? []).map((q) => q.quest_id),
    },
  });
}

// ─── PATCH /api/admin/events/[id] ───────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const { game_ids, quest_ids, cover_image_url, ...fields } = parsed.data;
  const admin = createAdminClient();

  const linkError = await validateEventQuestLinks(admin, quest_ids);
  if (linkError) return NextResponse.json({ error: linkError }, { status: 422 });

  const { data: event, error: updateError } = await admin
    .from("shg_events")
    .update({ ...fields, cover_image_url: cover_image_url || null })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError || !event) {
    return NextResponse.json({ error: "No se pudo actualizar el evento." }, { status: 500 });
  }

  // Diff/replace shg_event_games and shg_quest_events
  await admin.from("shg_event_games").delete().eq("event_id", params.id);
  if (game_ids.length > 0) {
    await admin.from("shg_event_games").insert(game_ids.map((game_id) => ({ event_id: params.id, game_id })));
  }

  await admin.from("shg_quest_events").delete().eq("event_id", params.id);
  if (quest_ids.length > 0) {
    await admin.from("shg_quest_events").insert(quest_ids.map((quest_id) => ({ event_id: params.id, quest_id })));
  }

  return NextResponse.json({ data: event });
}

// ─── DELETE /api/admin/events/[id] ──────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_events").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar el evento." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
