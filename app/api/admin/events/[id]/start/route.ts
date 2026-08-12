import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/admin/events/[id]/start ──────────────────────────────────────
// Marks the event live: closes registration and unlocks the self-service
// mission grid on the public event page.

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  const admin = createAdminClient();
  const { data: event } = await admin.from("shg_events").select("started_at, ended_at").eq("id", params.id).maybeSingle();
  if (!event) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  if (event.started_at) return NextResponse.json({ error: "Este evento ya empezó." }, { status: 422 });

  const { data, error: updateError } = await admin
    .from("shg_events")
    .update({ started_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo iniciar el evento." }, { status: 500 });
  return NextResponse.json({ data });
}
