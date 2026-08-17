import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questNoteCreateSchema } from "@/lib/validation/rol";

// The DM sees all three note threads for a quest: the public one everyone
// with access reads, their own dm_private thread, and every participating
// character's player_private thread.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_rol_quest_note")
    .select("*")
    .eq("quest_id", params.id)
    .order("created_at", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener las notas." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questNoteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("shg_rol_quest_note")
    .insert({
      quest_id: params.id,
      visibility: parsed.data.visibility,
      character_id: parsed.data.visibility === "player_private" ? parsed.data.character_id : null,
      author_id: user.id,
      author_kind: "admin",
      content: parsed.data.content,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo guardar la nota." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
