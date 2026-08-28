import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// The Rituals/Projects reference tables (Loremaster ritual costing, Tinkerer
// invention costing) — DM-only lookup data, read-only from the app's side
// (edited via scripts/seed-fu-reference-data.ts + a migration, like the rest
// of the shg_fu_* tables). Not part of FUReferenceData: nothing on the
// player-facing character sheet needs these, only this settings tool does.
export async function GET() {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const [
    { data: ritualDisciplines, error: e1 },
    { data: ritualPotencies, error: e2 },
    { data: ritualAreas, error: e3 },
    { data: projectPotencies, error: e4 },
    { data: projectAreas, error: e5 },
    { data: projectUses, error: e6 },
  ] = await Promise.all([
    admin.from("shg_fu_ritual_discipline").select("*").order("sort_order"),
    admin.from("shg_fu_ritual_potency").select("*").order("sort_order"),
    admin.from("shg_fu_ritual_area").select("*").order("sort_order"),
    admin.from("shg_fu_project_potency").select("*").order("sort_order"),
    admin.from("shg_fu_project_area").select("*").order("sort_order"),
    admin.from("shg_fu_project_uses").select("*").order("sort_order"),
  ]);

  const dbErr = e1 ?? e2 ?? e3 ?? e4 ?? e5 ?? e6;
  if (dbErr) return NextResponse.json({ error: "Error al obtener las tablas de Rituales/Proyectos." }, { status: 500 });

  return NextResponse.json({
    data: {
      ritualDisciplines: ritualDisciplines ?? [],
      ritualPotencies: ritualPotencies ?? [],
      ritualAreas: ritualAreas ?? [],
      projectPotencies: projectPotencies ?? [],
      projectAreas: projectAreas ?? [],
      projectUses: projectUses ?? [],
    },
  });
}
