import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requirePermissionAny } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { epicCreateSchema } from "@/lib/validation/planning";
import { isTaskOverdue } from "@/lib/planning/dates";
import type { PlanningTaskStatus } from "@/types/database";

// GET /api/admin/planning/epics?status=a,b&ownerId=&hasOverdue=1
// Epic cards need per-epic task aggregates (done/total/blocked/overdue) —
// fetched as one extra lightweight query (id/status/due_date only) across
// every matching epic and aggregated in JS, rather than a DB view, since
// this venue's whole epic+task volume is small enough that it's not worth
// the extra migration surface.
export async function GET(req: NextRequest) {
  const { error } = await requirePermissionAny(["planning", "planning_admin"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const ownerId = searchParams.get("ownerId");
  const hasOverdueOnly = searchParams.get("hasOverdue") === "1";

  const admin = createAdminClient();
  let query = admin
    .from("shg_epics")
    .select("*, event:shg_events(id, title, starts_at), owner:shg_admin_users!shg_epics_owner_id_fkey(id, name)")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (statusParam) query = query.in("status", statusParam.split(",").filter(Boolean));
  if (ownerId) query = query.eq("owner_id", ownerId);

  const { data: epics, error: dbErr } = await query;
  if (dbErr) return NextResponse.json({ error: "Error al obtener épicas." }, { status: 500 });

  const epicIds = (epics ?? []).map((e) => e.id);
  const { data: tasks } = epicIds.length
    ? await admin.from("shg_tasks").select("epic_id, status, due_date").in("epic_id", epicIds)
    : { data: [] as { epic_id: string; status: PlanningTaskStatus; due_date: string | null }[] };

  const byEpic = new Map<string, { total: number; done: number; blocked: number; overdue: number }>();
  for (const t of tasks ?? []) {
    const agg = byEpic.get(t.epic_id) ?? { total: 0, done: 0, blocked: 0, overdue: 0 };
    agg.total += 1;
    if (t.status === "done") agg.done += 1;
    if (t.status === "blocked") agg.blocked += 1;
    if (isTaskOverdue(t.due_date, t.status)) agg.overdue += 1;
    byEpic.set(t.epic_id, agg);
  }

  let data = (epics ?? []).map((e) => ({
    ...e,
    ...(byEpic.get(e.id) ?? { total: 0, done: 0, blocked: 0, overdue: 0 }),
  }));

  if (hasOverdueOnly) data = data.filter((e) => e.overdue > 0);

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requirePermission("planning_admin");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = epicCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("shg_epics")
    .insert({ ...parsed.data, created_by: user.id })
    .select("*, event:shg_events(id, title, starts_at), owner:shg_admin_users!shg_epics_owner_id_fkey(id, name)")
    .single();

  if (insertError) return NextResponse.json({ error: "No se pudo crear la épica." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
