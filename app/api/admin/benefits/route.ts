import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { benefitSchema } from "@/lib/validation/benefits";
import { loadBenefits } from "@/lib/benefits";

// Benefits share the "ranks" permission: they're part of the same
// progression setup (Configuración → Rangos / Beneficios).

export async function GET() {
  const { error } = await requirePermission("ranks");
  if (error) return error;

  const admin = createAdminClient();
  const data = await loadBenefits(admin, { activeOnly: false });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("ranks");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = benefitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin.from("shg_benefits").insert(parsed.data).select().single();
  if (insertError) return NextResponse.json({ error: "No se pudo crear el beneficio." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
