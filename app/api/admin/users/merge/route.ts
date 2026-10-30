import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { userMergeSchema } from "@/lib/validation/users";

// ─── POST /api/admin/users/merge ────────────────────────────────────────────
// Folds dropId into keepId and deletes dropId (duplicate accounts from two
// emails). All the work — moving quests, events, bookings, badges and
// characters, skipping duplicates and taking their XP/RP back — happens in
// one transaction inside shg_merge_users() (058_shg_merge_users.sql).

export async function POST(req: NextRequest) {
  const { user: adminUser, error } = await requirePermission("users");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = userMergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: rpcError } = await admin.rpc("shg_merge_users", {
    p_keep: parsed.data.keepId,
    p_drop: parsed.data.dropId,
    p_admin: adminUser.id,
  });

  if (rpcError) {
    // Our own raise messages (P0001) are written for the admin; anything else isn't.
    const message = rpcError.code === "P0001" ? rpcError.message : "No se pudieron fusionar las cuentas.";
    return NextResponse.json({ error: message }, { status: rpcError.code === "P0001" ? 422 : 500 });
  }

  return NextResponse.json({ data });
}
