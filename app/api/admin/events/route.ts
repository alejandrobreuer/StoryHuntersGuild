import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventSchema } from "@/lib/validation/events";
import { validateEventQuestLinks } from "@/lib/quests/validateEventQuestLinks";

function slugify(title: string): string {
  return title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

// ─── GET /api/admin/events ──────────────────────────────────────────────────

export async function GET() {
  const { error } = await requirePermission("events");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_events")
    .select("*, venue:shg_venues(id, name), event_games:shg_event_games(game_id), event_quests:shg_quest_events(quest_id)")
    .order("starts_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: "Error al obtener eventos." }, { status: 500 });

  // Flatten the nested joins so the admin card grid can show featured games
  // and assigned missions without a per-event detail fetch.
  const withIds = (data ?? []).map(({ event_games, event_quests, ...event }) => ({
    ...event,
    game_ids: ((event_games ?? []) as { game_id: string }[]).map((eg) => eg.game_id),
    quest_ids: ((event_quests ?? []) as { quest_id: string }[]).map((eq) => eq.quest_id),
  }));
  return NextResponse.json({ data: withIds });
}

// ─── POST /api/admin/events ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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

  const { data: event, error: insertError } = await admin
    .from("shg_events")
    .insert({ ...fields, cover_image_url: cover_image_url || null, slug: slugify(fields.title) })
    .select()
    .single();

  if (insertError || !event) {
    return NextResponse.json({ error: "No se pudo crear el evento." }, { status: 500 });
  }

  if (game_ids.length > 0) {
    await admin.from("shg_event_games").insert(game_ids.map((game_id) => ({ event_id: event.id, game_id })));
  }
  if (quest_ids.length > 0) {
    await admin.from("shg_quest_events").insert(quest_ids.map((quest_id) => ({ event_id: event.id, quest_id })));
  }

  return NextResponse.json({ data: event }, { status: 201 });
}
