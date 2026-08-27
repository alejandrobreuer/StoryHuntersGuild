import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_rol_quest_application")
    .select("*, character:shg_rol_character(id, name, owner:shg_users(name))")
    .eq("quest_id", params.id)
    .order("applied_at", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener las postulaciones." }, { status: 500 });
  return NextResponse.json({ data });
}
