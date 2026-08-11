import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { featureFlagSchema } from "@/lib/validation/feature-flags";

export async function PATCH(req: NextRequest, { params }: { params: { key: string } }) {
  const { error } = await requirePermission("feature_flags");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = featureFlagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("shg_feature_flags")
    .update({ enabled: parsed.data.enabled })
    .eq("key", params.key)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar la función." }, { status: 500 });
  return NextResponse.json({ data });
}
