import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questFinishSchema } from "@/lib/validation/rol";

// DM closes out an accepted mission — any supplies the leader never
// allocated land in the guild's general pool, no gate on allocation
// completeness — then flips the quest to 'completed', recording the DM's
// summary as the permanent history entry (per 019_shg_rol_init.sql's header
// comment: completed quests ARE the history log).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown = {};
  try { body = await req.json(); }
  catch { /* summary is optional — an empty body is fine */ }

  const parsed = questFinishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: rpcError } = await admin.rpc("shg_rol_finish_quest", {
    p_quest_id: params.id,
    p_admin_id: user.id,
    p_summary: parsed.data.history_summary || null,
  });

  if (rpcError) {
    return NextResponse.json({ error: "No se pudo finalizar la misión (¿ya estaba finalizada o todavía no fue aceptada?)." }, { status: 422 });
  }
  return NextResponse.json({ data });
}
