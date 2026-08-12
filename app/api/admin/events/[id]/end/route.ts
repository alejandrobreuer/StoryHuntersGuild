import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/admin/events/[id]/end ────────────────────────────────────────

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("events");
  if (error) return error;

  const admin = createAdminClient();
  const { data: event } = await admin.from("shg_events").select("started_at, ended_at").eq("id", params.id).maybeSingle();
  if (!event) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  if (!event.started_at) return NextResponse.json({ error: "Este evento todavía no empezó." }, { status: 422 });
  if (event.ended_at) return NextResponse.json({ error: "Este evento ya terminó." }, { status: 422 });

  const { data, error: updateError } = await admin
    .from("shg_events")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo finalizar el evento." }, { status: 500 });
  return NextResponse.json({ data });
}
