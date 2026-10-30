import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadUserActivity } from "@/lib/admin/userActivity";

// ─── GET /api/admin/users/export ────────────────────────────────────────────
// Every user's completed quests, event participations and badges, for the
// "Exportar" button in Admin › Usuarios (the user rows themselves come from
// GET /api/admin/users, which the page already has).

export async function GET() {
  const { error } = await requirePermission("users");
  if (error) return error;

  try {
    return NextResponse.json({ data: await loadUserActivity(createAdminClient(), null) });
  } catch {
    return NextResponse.json({ error: "No se pudo preparar la exportación." }, { status: 500 });
  }
}
