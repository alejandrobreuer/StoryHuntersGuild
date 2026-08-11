import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { error } = await requirePermission("feature_flags");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin.from("shg_feature_flags").select("*").order("key");
  if (dbErr) return NextResponse.json({ error: "Error al obtener las funciones." }, { status: 500 });
  return NextResponse.json({ data });
}
