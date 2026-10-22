import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { claimMission } from "@/lib/qr/missionClaim";

// ─── POST /api/qr/missions/[token]/claim ────────────────────────────────────
// Sent automatically by /m/[token] once the page has loaded — the page itself
// only reads, so a link preview or prefetch can never create a submission.
// Every check runs again here; the outcome drives which screen the player
// sees, so "already submitted" etc. are 200s, not errors.

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  try {
    const outcome = await claimMission(params.token, user);
    return NextResponse.json({ data: outcome });
  } catch {
    return NextResponse.json({ error: "No se pudo registrar la misión. Intentá de nuevo." }, { status: 500 });
  }
}
