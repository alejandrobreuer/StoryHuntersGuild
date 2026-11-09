import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { listStoredRulesGameIds, hasStaticRulesPdf } from "@/lib/rules-pdf";

// ─── GET /api/admin/rules ───────────────────────────────────────────────────
// Every game plus whether it has a full rulebook PDF — either uploaded from
// Admin → Juegos (shg-rules bucket) or bundled in public/rules/{id}.pdf.
// See lib/rules-pdf.ts.

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requirePermission("games");
  if (error) return error;

  const admin = createAdminClient();
  const [{ data, error: dbErr }, storedIds] = await Promise.all([
    admin.from("shg_games").select("id, name, image_url").order("name"),
    listStoredRulesGameIds(),
  ]);
  if (dbErr) return NextResponse.json({ error: "Error al obtener juegos." }, { status: 500 });

  const withPdf = (data ?? []).map((g) => ({
    ...g,
    hasPdf: storedIds.has(g.id) || hasStaticRulesPdf(g.id),
  }));

  return NextResponse.json({ data: withPdf });
}
