import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { FINANCE_RECEIPTS_BUCKET, FINANCE_RECEIPT_TYPES, MAX_FINANCE_RECEIPT_BYTES } from "@/lib/finance/receipts";

// ─── POST /api/admin/finance/receipts ───────────────────────────────────────
// multipart/form-data: file. Uploads a receipt and returns its path; the row
// stores it when it's saved (so a new, not-yet-saved row can have one too).

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("finances");
  if (error) return error;

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Elegí un archivo." }, { status: 422 });
  }
  if (!FINANCE_RECEIPT_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "El comprobante tiene que ser una imagen o un PDF." }, { status: 422 });
  }
  if (file.size > MAX_FINANCE_RECEIPT_BYTES) {
    return NextResponse.json({ error: "El comprobante no puede superar los 10 MB." }, { status: 422 });
  }

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const month = new Date().toISOString().slice(0, 7);
  const path = `${month}/${crypto.randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { error: uploadErr } = await admin.storage
    .from(FINANCE_RECEIPTS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadErr) {
    return NextResponse.json({ error: "No se pudo subir el comprobante." }, { status: 500 });
  }
  return NextResponse.json({ data: { path } }, { status: 201 });
}
