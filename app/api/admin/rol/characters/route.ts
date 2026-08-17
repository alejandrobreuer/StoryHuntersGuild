import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Full roster for the DM — used to pick participants when initiating a quest.
export async function GET() {
  const { error } = await requirePermission("rol");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("shg_rol_character")
    .select("id, name, owner:shg_users(name)")
    .order("name", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al obtener los personajes." }, { status: 500 });

  const rows = (data ?? []).map((c) => {
    const owner = Array.isArray(c.owner) ? c.owner[0] : c.owner;
    return { id: c.id, name: c.name, ownerName: owner?.name || "Aventurero" };
  });

  return NextResponse.json({ data: rows });
}
