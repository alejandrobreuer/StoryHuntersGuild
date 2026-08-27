import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOutlinedIcon, type IconOutlineColor } from "@/lib/rol/iconOutline";

const MAX_BYTES = 5 * 1024 * 1024;
// PNG/WebP only — both support real alpha, which the outline algorithm needs.
const ALLOWED_TYPES: Record<string, string> = { "image/png": "png", "image/webp": "webp" };
const OUTLINE_COLORS: IconOutlineColor[] = ["black", "red", "white"];

function isOutlineColor(v: unknown): v is IconOutlineColor {
  return typeof v === "string" && (OUTLINE_COLORS as string[]).includes(v);
}

// POST /api/admin/rol/locations/icon
//
// multipart/form-data { file, color } — new upload: stores the pristine
// original under rol-icons/{uuid}-source.<ext> (icon_source_url) and bakes a
// fresh outlined variant under rol-icons/{uuid}-outline-{color}.png (icon_url).
//
// application/json { source_url, color } — recolor only: re-bakes the
// outline from an already-stored source, without touching the uploaded art.
export async function POST(req: NextRequest) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const contentType = req.headers.get("content-type") ?? "";

  let sourceBuffer: Buffer;
  let sourcePublicUrl: string;
  let color: IconOutlineColor;
  let idPrefix: string;

  if (contentType.includes("application/json")) {
    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

    const { source_url, color: rawColor } = (body ?? {}) as { source_url?: string; color?: string };
    if (!source_url) return NextResponse.json({ error: "Falta la imagen de origen." }, { status: 422 });
    if (!isOutlineColor(rawColor)) return NextResponse.json({ error: "Color de contorno inválido." }, { status: 422 });
    color = rawColor;

    const match = /\/([0-9a-f-]{36})-source\.\w+(?:$|\?)/i.exec(source_url);
    if (!match) return NextResponse.json({ error: "No se pudo identificar la imagen de origen." }, { status: 422 });
    idPrefix = match[1];

    const sourceRes = await fetch(source_url);
    if (!sourceRes.ok) return NextResponse.json({ error: "No se pudo leer la imagen de origen." }, { status: 502 });
    sourceBuffer = Buffer.from(await sourceRes.arrayBuffer());
    sourcePublicUrl = source_url;
  } else {
    let form: FormData;
    try { form = await req.formData(); }
    catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

    const file = form.get("file");
    const rawColor = form.get("color");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Seleccioná un archivo." }, { status: 422 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo no puede superar los 5MB." }, { status: 422 });
    }
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json({ error: "El ícono necesita transparencia real: usá PNG o WebP." }, { status: 422 });
    }
    if (!isOutlineColor(rawColor)) {
      return NextResponse.json({ error: "Color de contorno inválido." }, { status: 422 });
    }
    color = rawColor;
    idPrefix = crypto.randomUUID();
    sourceBuffer = Buffer.from(await file.arrayBuffer());

    const sourcePath = `rol-icons/${idPrefix}-source.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("shg-media")
      .upload(sourcePath, sourceBuffer, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("[rol-icon] source upload failed:", uploadError);
      return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
    }
    sourcePublicUrl = admin.storage.from("shg-media").getPublicUrl(sourcePath).data.publicUrl;
  }

  let outlineBuffer: Buffer;
  try {
    outlineBuffer = await generateOutlinedIcon(sourceBuffer, { color });
  } catch (err) {
    console.error("[rol-icon] outline generation failed:", err);
    return NextResponse.json({ error: "No se pudo procesar la imagen." }, { status: 500 });
  }

  const outlinePath = `rol-icons/${idPrefix}-outline-${color}.png`;
  const { error: outlineUploadError } = await admin.storage
    .from("shg-media")
    .upload(outlinePath, outlineBuffer, { contentType: "image/png", upsert: true });
  if (outlineUploadError) {
    console.error("[rol-icon] outline upload failed:", outlineUploadError);
    return NextResponse.json({ error: "No se pudo guardar el ícono con contorno." }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from("shg-media").getPublicUrl(outlinePath);
  return NextResponse.json({ data: { url: publicUrl, sourceUrl: sourcePublicUrl } });
}
