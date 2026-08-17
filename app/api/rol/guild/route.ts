import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Guild view: identity + every feature (locked ones included — the UI grays
// them out so players know what to work toward) + ranks + the full member
// roster. Everything here is visible to any signed-in player.
export async function GET() {
  const { error } = await requireSessionUser();
  if (error) return error;

  const admin = createAdminClient();
  const [{ data: guild }, { data: features }, { data: ranks }, { data: characters }] = await Promise.all([
    admin.from("shg_rol_guild").select("*").limit(1).maybeSingle(),
    admin.from("shg_rol_guild_feature").select("*").order("sort_order", { ascending: true }),
    admin.from("shg_rol_guild_rank").select("*").order("points_threshold", { ascending: true }),
    admin
      .from("shg_rol_character")
      .select("id, name, sheet_data, guild_points, guild_rank_id, owner:shg_users(name)")
      .order("guild_points", { ascending: false }),
  ]);

  if (!guild) return NextResponse.json({ error: "El gremio no fue inicializado." }, { status: 404 });

  const roster = (characters ?? []).map((c) => {
    const owner = Array.isArray(c.owner) ? c.owner[0] : c.owner;
    const sheet = (c.sheet_data ?? {}) as { identity?: string; theme?: string };
    return {
      id: c.id,
      name: c.name,
      ownerName: owner?.name || "Aventurero",
      guildPoints: c.guild_points,
      guildRankId: c.guild_rank_id,
      summary: sheet.identity || sheet.theme || "",
    };
  });

  return NextResponse.json({ data: { guild, features: features ?? [], ranks: ranks ?? [], roster } });
}
