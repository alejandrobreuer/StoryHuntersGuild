import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/rules ───────────────────────────────────────────────────
// Full rulebook PDFs live as static files at public/rules/{game_id}.pdf —
// not in Storage, since these are large (many 5-20MB) reference files bundled
// with the app rather than admin-uploaded content. "Has a PDF" is just a
// filesystem check against that folder, keyed by the game's own id, so
// dropping a new {id}.pdf in there is the entire "upload" step for now.

export async function GET() {
  const { error } = await requirePermission("games");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_games")
    .select("id, name, image_url")
    .order("name");
  if (dbErr) return NextResponse.json({ error: "Error al obtener juegos." }, { status: 500 });

  const rulesDir = path.join(process.cwd(), "public", "rules");
  const withPdf = (data ?? []).map((g) => ({
    ...g,
    hasPdf: fs.existsSync(path.join(rulesDir, `${g.id}.pdf`)),
  }));

  return NextResponse.json({ data: withPdf });
}
