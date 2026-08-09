import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questSchema } from "@/lib/validation/quests";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_quests")
    .select("*, badge:shg_badges(id, name, icon, icon_url)")
    .order("created_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: "Error al obtener las misiones." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
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
      goal_count: parsed.data.goal_count || null,
      starts_at: parsed.data.starts_at || null,
      ends_at: parsed.data.ends_at || null,
      event_id: parsed.data.event_id || null,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear la misión." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
