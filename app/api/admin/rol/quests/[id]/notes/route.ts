import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questNoteCreateSchema } from "@/lib/validation/rol";

// The DM sees all three note documents for a quest: the public one everyone
// with access reads, their own dm_private document, and every participating
// character's player_private document.
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

// Each thread (public / dm_private / one per participant's player_private)
// is exactly one document now, not a message list — saving overwrites it in
// place. Explicit select-then-update-or-insert rather than a DB upsert:
// there's no unique constraint backing this (see 033_shg_rol_quest_note_
// document.sql's header comment), the app itself is the sole enforcer.
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
  const characterId = parsed.data.visibility === "player_private" ? parsed.data.character_id ?? null : null;

  let existingQuery = admin
    .from("shg_rol_quest_note")
    .select("id")
    .eq("quest_id", params.id)
    .eq("visibility", parsed.data.visibility);
  existingQuery = characterId ? existingQuery.eq("character_id", characterId) : existingQuery.is("character_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  const now = new Date().toISOString();
  const row = existing
    ? await admin
        .from("shg_rol_quest_note")
        .update({ content: parsed.data.content, author_id: user.id, author_kind: "admin", updated_at: now })
        .eq("id", existing.id)
        .select()
        .single()
    : await admin
        .from("shg_rol_quest_note")
        .insert({
          quest_id: params.id,
          visibility: parsed.data.visibility,
          character_id: characterId,
          author_id: user.id,
          author_kind: "admin",
          content: parsed.data.content,
        })
        .select()
        .single();

  if (row.error) return NextResponse.json({ error: "No se pudo guardar la nota." }, { status: 500 });
  return NextResponse.json({ data: row.data }, { status: existing ? 200 : 201 });
}
