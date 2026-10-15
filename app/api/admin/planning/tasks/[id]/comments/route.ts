import { NextRequest, NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { commentSchema } from "@/lib/validation/planning";
import { notifyAdmins, taskLink } from "@/lib/notifications";

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

  // The task's assignee and creator hear about it (never the comment's own author).
  const { data: task } = await admin
    .from("shg_tasks")
    .select("id, epic_id, title, assignee_id, created_by")
    .eq("id", params.id)
    .maybeSingle();
  if (task) {
    await notifyAdmins({
      recipientIds: [task.assignee_id, task.created_by],
      actorId:      user.id,
      type:         "task_comment",
      title:        (actor) => `${actor} comentó en "${task.title}"`,
      body:         parsed.data.body,
      link:         taskLink(task.epic_id, task.id),
      taskId:       task.id,
    });
  }

  return NextResponse.json({ data }, { status: 201 });
}
