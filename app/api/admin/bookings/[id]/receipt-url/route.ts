import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/bookings/[id]/receipt-url ──────────────────────────────
// Generates a short-lived signed URL for the private shg-receipts bucket —
// receipts are never public, unlike cardstash.ar's chat-image pattern (these
// can show bank account info).

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data: booking } = await admin.from("shg_bookings").select("receipt_path").eq("id", params.id).maybeSingle();

  if (!booking?.receipt_path) {
    return NextResponse.json({ error: "Sin comprobante." }, { status: 404 });
  }

  const { data: signed, error: signError } = await admin.storage
    .from("shg-receipts")
    .createSignedUrl(booking.receipt_path, 300);

  if (signError || !signed) {
    return NextResponse.json({ error: "No se pudo generar el enlace." }, { status: 500 });
  }

  return NextResponse.json({ data: { url: signed.signedUrl } });
}
