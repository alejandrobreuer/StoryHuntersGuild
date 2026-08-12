import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questSchema } from "@/lib/validation/quests";

export async function GET() {
  const { error } = await requirePermission("quests");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_quests")
    .select("*, badge:shg_badges(id, name, icon, icon_url), game:shg_games(id, name, image_url), quest_events:shg_quest_events(status, closed_at, event:shg_events(id, title))")
    .order("created_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: "Error al obtener las misiones." }, { status: 500 });

  // Flatten the linked-events join so the admin list doesn't need a
  // per-quest detail fetch to know which events a mission is assigned to.
  type EventLink = { id: string; title: string; status: string; closed_at: string | null };
  const withEvents = (data ?? []).map(({ quest_events, ...quest }) => ({
    ...quest,
    events: ((quest_events ?? []) as { status: string; closed_at: string | null; event: { id: string; title: string } | { id: string; title: string }[] | null }[])
      .map((qe) => {
        const event = Array.isArray(qe.event) ? qe.event[0] : qe.event;
        return event ? { ...event, status: qe.status, closed_at: qe.closed_at } : null;
      })
      .filter((e): e is EventLink => Boolean(e)),
  }));

  return NextResponse.json({ data: withEvents });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("quests");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("shg_quests")
    .insert({
      ...parsed.data,
      badge_id: parsed.data.badge_id || null,
      game_id: parsed.data.game_id || null,
      max_participants: parsed.data.max_participants || null,
      required_turn_ins: parsed.data.required_turn_ins || null,
      goal_count: parsed.data.goal_count || null,
      starts_at: parsed.data.starts_at || null,
      ends_at: parsed.data.ends_at || null,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear la misión." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
