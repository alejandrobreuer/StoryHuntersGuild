import type { createAdminClient } from "@/lib/supabase/admin";

// ─── Profile pictures (server side) ─────────────────────────────────────────
// Shared by the player's own /api/profile/avatar and staff's
// /api/admin/users/[id]/avatar. Files go to the public shg-media bucket under
// avatars/<user id>/; replacing or removing one deletes the previous file.
// (After an account merge a player may keep a photo stored under the dropped
// account's folder, so any avatars/ path we issued counts as theirs.)

type Admin = ReturnType<typeof createAdminClient>;
type Result = { ok: true; avatar_url: string | null } | { ok: false; error: string; status: number };

const BUCKET = "shg-media";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Checks the file's first bytes, so a renamed file can't pass as an image. */
function looksLikeImage(bytes: Uint8Array, type: string): boolean {
  const ascii = (from: number, to: number) => Array.from(bytes.slice(from, to), (b) => String.fromCharCode(b)).join("");
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return false;
}

/** Storage path of an avatar URL we issued, or null for anything else. */
function avatarPath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  return path.startsWith("avatars/") ? path : null;
}

/** Deletes an avatar file from storage (no-op for URLs we didn't issue). */
export async function removeAvatarFile(admin: Admin, url: string | null) {
  const path = avatarPath(url);
  if (!path) return;
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) console.error("[avatar] couldn't delete old file:", error);
}

async function currentAvatar(admin: Admin, userId: string): Promise<{ exists: boolean; url: string | null }> {
  const { data } = await admin.from("shg_users").select("avatar_url").eq("id", userId).maybeSingle();
  return { exists: Boolean(data), url: data?.avatar_url ?? null };
}

/** Uploads `file` (from a form's "file" field) as the user's profile picture. */
export async function setAvatar(admin: Admin, userId: string, file: FormDataEntryValue | null): Promise<Result> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Seleccioná una imagen.", status: 422 };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, error: "La imagen no puede superar los 2MB.", status: 422 };
  const ext = TYPES[file.type];
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!ext || !looksLikeImage(bytes, file.type)) return { ok: false, error: "Formatos permitidos: JPG, PNG o WebP.", status: 422 };

  const current = await currentAvatar(admin, userId);
  if (!current.exists) return { ok: false, error: "Usuario no encontrado.", status: 404 };

  const path = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("[avatar] upload failed:", uploadError);
    return { ok: false, error: "No se pudo subir la imagen.", status: 500 };
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path);
  const { error: updateError } = await admin.from("shg_users").update({ avatar_url: publicUrl }).eq("id", userId);
  if (updateError) {
    await admin.storage.from(BUCKET).remove([path]);
    return { ok: false, error: "No se pudo guardar la foto.", status: 500 };
  }

  await removeAvatarFile(admin, current.url);
  return { ok: true, avatar_url: publicUrl };
}

/** Removes the user's profile picture (the profile goes back to the rank emblem). */
export async function clearAvatar(admin: Admin, userId: string): Promise<Result> {
  const current = await currentAvatar(admin, userId);
  if (!current.exists) return { ok: false, error: "Usuario no encontrado.", status: 404 };
  const { error } = await admin.from("shg_users").update({ avatar_url: null }).eq("id", userId);
  if (error) return { ok: false, error: "No se pudo quitar la foto.", status: 500 };
  await removeAvatarFile(admin, current.url);
  return { ok: true, avatar_url: null };
}
