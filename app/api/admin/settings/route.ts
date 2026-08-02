import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data } = await admin.from("shg_settings").select("*");
  return NextResponse.json({ data: data ?? [] });
}

const patchSchema = z.object({
  key:   z.string().min(1),
  value: z.string(),
});

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { error: upsertError } = await admin
    .from("shg_settings")
    .upsert({ key: parsed.data.key, value: parsed.data.value, updated_at: new Date().toISOString() });

  if (upsertError) return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
