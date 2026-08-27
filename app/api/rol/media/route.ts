import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ─── POST /api/rol/media ────────────────────────────────────────────────────
// Player-facing equivalent of /api/admin/media (which requires an admin
// session) — same public shg-media bucket, gated by a plain signed-in
// player session instead. Used for character portrait/full-body uploads.
export async function POST(req: NextRequest) {
  const { error } = await requireSessionUser();
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
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Formatos permitidos: JPG, PNG, WebP o GIF." }, { status: 422 });
  }

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("shg-media")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[rol-media] upload failed:", uploadError);
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from("shg-media").getPublicUrl(path);
  return NextResponse.json({ data: { url: publicUrl } });
}
