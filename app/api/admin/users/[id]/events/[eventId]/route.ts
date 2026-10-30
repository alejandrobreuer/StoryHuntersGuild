import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeParticipation } from "@/lib/events/participation";

// ─── DELETE /api/admin/users/[id]/events/[eventId] ──────────────────────────
// Removes the player's participation in that event (check-in and booking
// attendance) and takes back the RP it granted.

export async function DELETE(_req: Request, { params }: { params: { id: string; eventId: string } }) {
  const { error } = await requirePermission("users");
  if (error) return error;

  const result = await removeParticipation(createAdminClient(), params.id, params.eventId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
