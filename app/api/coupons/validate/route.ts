import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyCouponSchema } from "@/lib/validation/coupons";
import { getSessionUser } from "@/lib/auth/guard";
import { checkInviteCode } from "@/lib/benefits";

// ─── POST /api/coupons/validate ─────────────────────────────────────────────
// Read-only check used by the booking form's "Aplicar" button, so the total
// updates immediately without waiting for the actual booking submit. This
// never marks a code used; that only happens atomically inside
// POST /api/bookings, right before the booking is created, so a code checked
// here but never actually booked stays available.
//
// Takes coupons and members' invite codes (shg_invite_codes). Invites depend
// on who's booking (only first-timers, not the owner), so those need the
// session; plain coupons don't.

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

  if (coupon) {
    if (coupon.used) return NextResponse.json({ error: "Ese código ya fue utilizado." }, { status: 422 });
    return NextResponse.json({ data: { discount_percent: coupon.discount_percent, kind: "coupon" } });
  }

  const sessionUser = await getSessionUser();
  const invite = await checkInviteCode(admin, parsed.data.code, sessionUser?.id ?? null);
  if (!invite) return NextResponse.json({ error: "Ese código no existe." }, { status: 404 });
  if (!invite.ok) return NextResponse.json({ error: invite.error }, { status: 422 });
  return NextResponse.json({ data: { discount_percent: invite.invite.discount_percent, kind: "invite" } });
}
