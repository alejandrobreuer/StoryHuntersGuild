import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questContributeSchema } from "@/lib/validation/quests";

// ─── POST /api/admin/quests/[id]/contribute ─────────────────────────────────
// Community quests only: logs a contribution toward the shared goal. No
// reward yet — see /reward-contributors, the separate action that grants
// everyone their reward once the goal is met (or whenever the admin decides).
// If eventId is given and the quest has a max_completions_per_event > 0,
// this caps how many contribution rows can be logged for that event.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user: adminUser, error } = await requirePermission("quests");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questContributeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { eventId } = parsed.data;

  if (eventId) {
    const { data: quest } = await admin.from("shg_quests").select("max_completions_per_event").eq("id", params.id).maybeSingle();
    if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });

    if (quest.max_completions_per_event > 0) {
      const { count } = await admin
        .from("shg_quest_completions")
        .select("id", { count: "exact", head: true })
        .eq("quest_id", params.id)
        .eq("event_id", eventId);
      if ((count ?? 0) >= quest.max_completions_per_event) {
        return NextResponse.json({ error: "Esta misión ya alcanzó el límite de veces para este evento." }, { status: 422 });
      }
    }
  }

  const { data, error: insertError } = await admin
    .from("shg_quest_completions")
    .insert({
      quest_id: params.id,
      user_id: parsed.data.userId,
      contribution_amount: parsed.data.amount,
      event_id: eventId || null,
      logged_by: adminUser.id,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo registrar la contribución." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
