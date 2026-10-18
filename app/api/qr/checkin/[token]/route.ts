import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { performCheckin } from "@/lib/qr/checkin";

// ─── POST /api/qr/checkin/[token] ───────────────────────────────────────────
// Sent automatically by /checkin/[token] once the page has loaded. Creates
// or keeps the player's attendance row for the event.

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  try {
    const outcome = await performCheckin(params.token, user);
    return NextResponse.json({ data: outcome });
  } catch {
    return NextResponse.json({ error: "No se pudo registrar tu llegada. Intentá de nuevo." }, { status: 500 });
  }
}
