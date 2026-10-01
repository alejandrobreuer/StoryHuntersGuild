import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyCouponSchema } from "@/lib/validation/coupons";

// ─── POST /api/coupons/validate ─────────────────────────────────────────────
// Public (no auth) — read-only check used by the booking form's "Aplicar"
// button, so the total updates immediately without waiting for the actual
// booking submit. This never marks a coupon used; that only happens
// atomically inside POST /api/bookings, right before the booking is created,
// so a code checked here but never actually booked stays available.

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = applyCouponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Código inválido." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: coupon } = await admin
    .from("shg_coupons")
    .select("discount_percent, used")
    .ilike("code", parsed.data.code)
    .maybeSingle();

  if (!coupon) return NextResponse.json({ error: "Ese código no existe." }, { status: 404 });
  if (coupon.used) return NextResponse.json({ error: "Ese código ya fue utilizado." }, { status: 422 });

  return NextResponse.json({ data: { discount_percent: coupon.discount_percent } });
}
