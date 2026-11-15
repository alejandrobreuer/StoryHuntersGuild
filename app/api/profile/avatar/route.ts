import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── /api/profile/avatar ────────────────────────────────────────────────────
// The player's own profile picture. POST uploads/replaces it, DELETE removes
// it (the profile goes back to the rank emblem). Files go to the public
// shg-media bucket under avatars/<user id>/, and the previous file is deleted.

const BUCKET = "shg-media";
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Checks the file's first bytes, so a renamed file can't pass as an image. */
function looksLikeImage(bytes: Uint8Array, type: string): boolean {
  const ascii = (from: number, to: number) => Array.from(bytes.slice(from, to), (b) => String.fromCharCode(b)).join("");
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return false;
}

/** Storage path of a URL we issued, or null for anything else. */
function ownPath(url: string | null, userId: string): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  return path.startsWith(`avatars/${userId}/`) ? path : null;
}

async function removeOld(admin: ReturnType<typeof createAdminClient>, url: string | null, userId: string) {
  const path = ownPath(url, userId);
  if (!path) return;
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) console.error("[avatar] couldn't delete old file:", error);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Seleccioná una imagen." }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen no puede superar los 2MB." }, { status: 422 });
  }
  const ext = TYPES[file.type];
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!ext || !looksLikeImage(bytes, file.type)) {
    return NextResponse.json({ error: "Formatos permitidos: JPG, PNG o WebP." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: current } = await admin.from("shg_users").select("avatar_url").eq("id", user.id).maybeSingle();

  const path = `avatars/${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("[avatar] upload failed:", uploadError);
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path);
  const { error: updateError } = await admin.from("shg_users").update({ avatar_url: publicUrl }).eq("id", user.id);
  if (updateError) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "No se pudo guardar la foto." }, { status: 500 });
  }

  await removeOld(admin, current?.avatar_url ?? null, user.id);
  return NextResponse.json({ data: { avatar_url: publicUrl } });
}

export async function DELETE() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const { data: current } = await admin.from("shg_users").select("avatar_url").eq("id", user.id).maybeSingle();
  const { error: updateError } = await admin.from("shg_users").update({ avatar_url: null }).eq("id", user.id);
  if (updateError) return NextResponse.json({ error: "No se pudo quitar la foto." }, { status: 500 });

  await removeOld(admin, current?.avatar_url ?? null, user.id);
  return NextResponse.json({ data: { avatar_url: null } });
}
