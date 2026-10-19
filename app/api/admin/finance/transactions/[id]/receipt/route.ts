import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { FINANCE_RECEIPTS_BUCKET } from "@/lib/finance/receipts";

// ─── GET /api/admin/finance/transactions/[id]/receipt ───────────────────────
// Short-lived signed URL for a row's receipt. Manual rows keep theirs in
// shg-finance-receipts; a reservation's is the one the customer uploaded
// with the booking, in shg-receipts.

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("finances");
  if (error) return error;

  const admin = createAdminClient();
  const { data: tx } = await admin
    .from("shg_finance_transactions")
    .select("source, receipt_path, booking:shg_bookings(receipt_path)")
    .eq("id", params.id)
    .maybeSingle();
  if (!tx) return NextResponse.json({ error: "Movimiento no encontrado." }, { status: 404 });

  const booking = Array.isArray(tx.booking) ? tx.booking[0] : tx.booking;
  const [bucket, path] = tx.source === "booking"
    ? ["shg-receipts", booking?.receipt_path ?? null]
    : [FINANCE_RECEIPTS_BUCKET, tx.receipt_path];
  if (!path) return NextResponse.json({ error: "Sin comprobante." }, { status: 404 });

  const { data: signed, error: signErr } = await admin.storage.from(bucket).createSignedUrl(path, 300);
  if (signErr || !signed) {
    return NextResponse.json({ error: "No se pudo abrir el comprobante." }, { status: 500 });
  }
  return NextResponse.json({ data: { url: signed.signedUrl } });
}
