import { NextRequest, NextResponse } from "next/server";
import { requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { taskReorderSchema } from "@/lib/validation/planning";

// Rewrites one status column's full order in one atomic statement (see
// shg_planning_reorder_tasks in 044_shg_planning.sql) — used for both a
// same-column drag (one call) and a cross-column drag (two calls, one per
// affected column) from the board/list drag-and-drop.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = taskReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { error: rpcError } = await admin.rpc("shg_planning_reorder_tasks", {
    p_epic_id: params.id,
    p_status: parsed.data.status,
    p_ordered_ids: parsed.data.ordered_ids,
  });

  if (rpcError) return NextResponse.json({ error: "No se pudo reordenar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
