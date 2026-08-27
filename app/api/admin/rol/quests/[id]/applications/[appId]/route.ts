import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questApplicationDecisionSchema } from "@/lib/validation/rol";

// DM approves or rejects one application. Approving is capped at the
// mission's max_participants — the DM decides who's in when there are more
// applicants than slots (see 028_shg_rol_quest_applications.sql).
export async function PATCH(req: NextRequest, { params }: { params: { id: string; appId: string } }) {
  const { user, error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questApplicationDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();

  const { data: application } = await admin
    .from("shg_rol_quest_application")
    .select("id, status")
    .eq("id", params.appId)
    .eq("quest_id", params.id)
    .maybeSingle();
  if (!application) return NextResponse.json({ error: "Postulación no encontrada." }, { status: 404 });
  if (application.status !== "pending") {
    return NextResponse.json({ error: "Esta postulación ya fue decidida." }, { status: 422 });
  }

  if (parsed.data.status === "approved") {
    const [{ data: quest }, { count: approvedCount }] = await Promise.all([
      admin.from("shg_rol_quest").select("max_participants, status").eq("id", params.id).maybeSingle(),
      admin
        .from("shg_rol_quest_application")
        .select("id", { count: "exact", head: true })
        .eq("quest_id", params.id)
        .eq("status", "approved"),
    ]);
    if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
    if (quest.status !== "available") {
      return NextResponse.json({ error: "Esta misión ya fue iniciada." }, { status: 422 });
    }
    if ((approvedCount ?? 0) >= quest.max_participants) {
      return NextResponse.json({ error: "La misión ya alcanzó su cupo máximo de participantes." }, { status: 422 });
    }
  }

  const { data, error: updateError } = await admin
    .from("shg_rol_quest_application")
    .update({ status: parsed.data.status, decided_at: new Date().toISOString(), decided_by: user.id })
    .eq("id", params.appId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo actualizar la postulación." }, { status: 500 });
  return NextResponse.json({ data });
}
