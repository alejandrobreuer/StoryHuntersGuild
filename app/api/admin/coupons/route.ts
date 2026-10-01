import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { couponSchema } from "@/lib/validation/coupons";

export async function GET() {
  const { error } = await requirePermission("bookings");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin.from("shg_coupons").select("*").order("created_at", { ascending: false });
  if (dbErr) return NextResponse.json({ error: "Error al obtener cupones." }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("bookings");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("shg_coupons")
    .insert(parsed.data)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Ese código ya existe." }, { status: 422 });
    }
    return NextResponse.json({ error: "No se pudo crear el cupón." }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
