import { NextRequest, NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { commentSchema } from "@/lib/validation/planning";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
  const { data: existing } = await admin.from("shg_task_comments").select("author_id").eq("id", params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Comentario no encontrado." }, { status: 404 });
  if (existing.author_id !== user.id) {
    return NextResponse.json({ error: "Solo podés editar tus propios comentarios." }, { status: 403 });
  }

  const { data, error: updateError } = await admin
    .from("shg_task_comments")
    .update({ body: parsed.data.body })
    .eq("id", params.id)
    .select("*, author:shg_admin_users(id, name)")
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo editar el comentario." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  const admin = createAdminClient();
  const { data: existing } = await admin.from("shg_task_comments").select("author_id").eq("id", params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Comentario no encontrado." }, { status: 404 });

  const isOwnComment = existing.author_id === user.id;
  if (!isOwnComment && !user.permissions.planning_admin) {
    return NextResponse.json({ error: "Solo podés eliminar tus propios comentarios." }, { status: 403 });
  }

  const { error: deleteError } = await admin.from("shg_task_comments").delete().eq("id", params.id);
  if (deleteError) return NextResponse.json({ error: "No se pudo eliminar el comentario." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
