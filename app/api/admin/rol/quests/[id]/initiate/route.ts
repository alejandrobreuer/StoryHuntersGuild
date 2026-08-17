import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { questInitiateSchema } from "@/lib/validation/rol";

// Admin "initiates" an available quest by assigning participating characters
// — only then does the full quest page unlock for those players, and the
// quest flips to 'active'. Never reverts to 'available'.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission("rol");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = questInitiateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: quest } = await admin.from("shg_rol_quest").select("status").eq("id", params.id).maybeSingle();
  if (!quest) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  if (quest.status !== "available") {
    return NextResponse.json({ error: "Esta misión ya fue iniciada." }, { status: 422 });
  }

  const { error: participantsError } = await admin
    .from("shg_rol_quest_participant")
    .insert(parsed.data.character_ids.map((character_id) => ({ quest_id: params.id, character_id })));
  if (participantsError) return NextResponse.json({ error: "No se pudo asignar a los personajes." }, { status: 500 });

  const { data, error: updateError } = await admin
    .from("shg_rol_quest")
    .update({ status: "active" })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "No se pudo iniciar la misión." }, { status: 500 });
  return NextResponse.json({ data });
}
