import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkLogCreateSchema } from "@/lib/validation/rol";

async function resolveMyCharacter(admin: ReturnType<typeof createAdminClient>, questId: string, userId: string) {
  const { data: participantRows } = await admin
    .from("shg_rol_quest_participant")
    .select("character:shg_rol_character(id, owner_id)")
    .eq("quest_id", questId);
  return (participantRows ?? [])
    .map((p) => (Array.isArray(p.character) ? p.character[0] : p.character))
    .find((c) => c?.owner_id === userId) ?? null;
}

/** Last 50 Checks this session's character rolled during this quest, newest first — the sheet's "Historial de tiradas". */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const myCharacter = await resolveMyCharacter(admin, params.id, user.id);
  if (!myCharacter) return NextResponse.json({ error: "No participás en esta misión." }, { status: 403 });

  const { data } = await admin
    .from("shg_rol_check_history")
    .select("id, label, result, created_at")
    .eq("quest_id", params.id)
    .eq("character_id", myCharacter.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ data: data ?? [] });
}

/** Logs one dice Check (attribute roll, weapon attack, spell Magic Check) — called by app/FU/lib/diceRoller.ts, best-effort from the caller's side. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = checkLogCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const myCharacter = await resolveMyCharacter(admin, params.id, user.id);
  if (!myCharacter) return NextResponse.json({ error: "No participás en esta misión." }, { status: 403 });

  const { data, error: insertError } = await admin
    .from("shg_rol_check_history")
    .insert({ quest_id: params.id, character_id: myCharacter.id, label: parsed.data.label, result: parsed.data.result })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo guardar la tirada." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
