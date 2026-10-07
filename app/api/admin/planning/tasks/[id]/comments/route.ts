import { NextRequest, NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { commentSchema } from "@/lib/validation/planning";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_task_comments")
    .select("*, author:shg_admin_users(id, name)")
    .eq("task_id", params.id)
    .order("created_at", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener comentarios." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("shg_task_comments")
    .insert({ task_id: params.id, author_id: user.id, body: parsed.data.body })
    .select("*, author:shg_admin_users(id, name)")
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo publicar el comentario." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
