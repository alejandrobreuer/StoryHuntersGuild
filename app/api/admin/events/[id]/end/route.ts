import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/admin/events/[id]/end ────────────────────────────────────────
// Ending the event also closes out its Event-type mission (there's at most
// one, enforced when quest_ids are saved): if it never reached
// required_turn_ins, it's marked "failed" and a failed history row is
// written for everyone who'd turned in — per the spec, nobody gets the
// reward if the mission wasn't achieved and closed in time.

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  const admin = createAdminClient();
  const { data: event } = await admin.from("shg_events").select("id, title, started_at, ended_at").eq("id", params.id).maybeSingle();
  if (!event) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  if (!event.started_at) return NextResponse.json({ error: "Este evento todavía no empezó." }, { status: 422 });
  if (event.ended_at) return NextResponse.json({ error: "Este evento ya terminó." }, { status: 422 });

  const { data, error: updateError } = await admin
    .from("shg_events")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo finalizar el evento." }, { status: 500 });

  await failUnachievedEventMission(admin, params.id, event.title);

  return NextResponse.json({ data });
}

async function failUnachievedEventMission(admin: ReturnType<typeof createAdminClient>, eventId: string, eventTitle: string) {
  const { data: link } = await admin
    .from("shg_quest_events")
    .select("quest_id, status, quest:shg_quests(id, title, type)")
    .eq("event_id", eventId)
    .eq("status", "open")
    .maybeSingle();
  if (!link) return;

  const quest = Array.isArray(link.quest) ? link.quest[0] : link.quest;
  if (!quest || quest.type !== "event") return;

  await admin
    .from("shg_quest_events")
    .update({ status: "failed", closed_at: new Date().toISOString() })
    .eq("quest_id", link.quest_id).eq("event_id", eventId).eq("status", "open");

  const { data: participants } = await admin
    .from("shg_quest_activations")
    .select("user_id, user:shg_users(id, email, name)")
    .eq("quest_id", link.quest_id).eq("event_id", eventId).in("status", ["turned_in", "confirmed"]);

  for (const p of participants ?? []) {
    const userRow = Array.isArray(p.user) ? p.user[0] : p.user;
    await admin.from("shg_quest_history").insert({
      quest_id: link.quest_id, quest_title: quest.title, quest_type: "event",
      event_id: eventId, event_title: eventTitle,
      user_id: p.user_id, user_label: userRow?.name || userRow?.email || "Aventurero",
      outcome: "failed", awarded_xp: 0, awarded_rp: 0,
    });
  }
}
