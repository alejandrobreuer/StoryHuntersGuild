import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventSchema } from "@/lib/validation/events";

// ─── GET /api/admin/events/[id] ─────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const [{ data: event }, { data: eventGames }] = await Promise.all([
    admin.from("shg_events").select("*, venue:shg_venues(id, name)").eq("id", params.id).maybeSingle(),
    admin.from("shg_event_games").select("game_id").eq("event_id", params.id),
  ]);

  if (!event) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  return NextResponse.json({ data: { ...event, game_ids: (eventGames ?? []).map((g) => g.game_id) } });
}

// ─── PATCH /api/admin/events/[id] ───────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const { game_ids, cover_image_url, ...fields } = parsed.data;
  const admin = createAdminClient();

  const { data: event, error: updateError } = await admin
    .from("shg_events")
    .update({ ...fields, cover_image_url: cover_image_url || null })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError || !event) {
    return NextResponse.json({ error: "No se pudo actualizar el evento." }, { status: 500 });
  }

  // Diff/replace shg_event_games
  await admin.from("shg_event_games").delete().eq("event_id", params.id);
  if (game_ids.length > 0) {
    await admin.from("shg_event_games").insert(game_ids.map((game_id) => ({ event_id: params.id, game_id })));
  }

  return NextResponse.json({ data: event });
}

// ─── DELETE /api/admin/events/[id] ──────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("shg_events").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar el evento." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
