import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { loadReferenceData } from "@/app/FU/data/loadReferenceData";

// Fabula Ultima rules content (classes/skills/spells/arcana/equipment/status
// effects/inventory items) — same for every player, changes essentially
// never. requireSessionUser() reads cookies(), which forces this route
// dynamic (no static/data-cache revalidate window applies) — a real
// Cache-Control header still lets the browser skip the DB round trip on
// repeat loads within the same session instead.
export async function GET() {
  const { error } = await requireSessionUser();
  if (error) return error;

  const data = await loadReferenceData();
  return NextResponse.json({ data }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
