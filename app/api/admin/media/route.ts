import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024;

// ─── POST /api/admin/media ──────────────────────────────────────────────────
// Public bucket — game/event cover images, meant to be publicly displayed.

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Seleccioná un archivo." }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo no puede superar los 5MB." }, { status: 422 });
  }

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("shg-media")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("shg-media").getPublicUrl(path);
  return NextResponse.json({ data: { url: publicUrl } });
}
