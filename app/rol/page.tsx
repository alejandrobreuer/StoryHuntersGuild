import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Shield } from "lucide-react";
import { getAdminUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeRank } from "@/lib/rol/rank";
import { GuildFeaturesDrawer } from "@/components/rol/GuildFeaturesDrawer";
import { GuildStaffSection } from "@/components/rol/GuildStaffSection";
import { ROL_NPC_SELECT } from "@/lib/rol/npcSelect";
import { oneOf, type NpcRow } from "@/lib/rol/npc";
import type { ShgRolGuildFeature, ShgRolGuildRank, ShgRolGuildStatus } from "@/types/database";

export const metadata = { title: "Gremio — Story Hunters Guild" };
export const dynamic = "force-dynamic";

interface RosterCharacter {
  id: string;
  name: string;
  guild_points: number;
  guild_rank_id: string | null;
  sheet_data: { identity?: string; theme?: string } | null;
  owner: { name: string | null } | { name: string | null }[] | null;
}

// Auth is guarded by app/rol/layout.tsx — every /rol/** route requires a
// signed-in player before this ever renders.
export default async function RolGuildPage() {
  noStore();
  const adminUser = await getAdminUser();
  const isRolAdmin = Boolean(adminUser?.permissions.rol);

  const admin = createAdminClient();
  const [{ data: guild }, { data: features }, { data: statuses }, { data: ranks }, { data: characters }, { data: npcs }] = await Promise.all([
    admin.from("shg_rol_guild").select("*").limit(1).maybeSingle(),
    admin.from("shg_rol_guild_feature").select("*").order("sort_order", { ascending: true }),
    admin.from("shg_rol_guild_status").select("*").order("sort_order", { ascending: true }),
    admin.from("shg_rol_guild_rank").select("*").order("points_threshold", { ascending: true }),
    admin
      .from("shg_rol_character")
      .select("id, name, guild_points, guild_rank_id, sheet_data, owner:shg_users(name)")
      .order("guild_points", { ascending: false }),
    admin.from("shg_rol_npc").select(ROL_NPC_SELECT).order("name", { ascending: true }),
  ]);

  if (!guild) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-14 text-center">
        <p className="font-body italic text-parchment-dark">El gremio todavía no fue configurado.</p>
      </main>
    );
  }

  const rankById = new Map<string, ShgRolGuildRank>((ranks ?? []).map((r) => [r.id, r]));
  const featureList = (features ?? []) as ShgRolGuildFeature[];
  const statusById = new Map<string, ShgRolGuildStatus>((statuses ?? []).map((s) => [s.id, s]));
  const currentStatus = guild.current_guild_status_id ? statusById.get(guild.current_guild_status_id) : null;

  // Guild Staff = any NPC currently ("Ex-" doesn't count) in the faction
  // sharing the guild's own name — a GM creates that faction and assigns
  // staff NPCs to it, same as any other faction. Hidden NPCs are excluded
  // for regular players, same as the DM-only visibility on /rol/npcs.
  const guildStaff = ((npcs ?? []) as unknown as NpcRow[]).filter((n) =>
    (isRolAdmin || !n.hidden) && n.factions.some((fl) => !fl.is_former && oneOf(fl.faction)?.name === guild.name)
  );

  return (
    <>
      {/* min-h-[calc(100vh-60px)], not min-h-screen: this section renders below
          the ~60px site Nav, so a literal 100vh here overshoots the visible
          viewport by that same amount before <main> begins. */}
      <section className="relative min-h-[calc(100vh-60px)] overflow-hidden flex items-end">
        {guild.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- full-bleed hero, fills its container by design
          <img src={guild.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1c1810]">
            <Shield size={96} className="text-leather-light/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/10" />

        <GuildFeaturesDrawer features={featureList} statuses={(statuses ?? []) as ShgRolGuildStatus[]} />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-24 pt-24">
          <h1 className="font-display text-4xl text-parchment mb-1">{guild.name}</h1>
          <p className="font-label text-xs uppercase tracking-widest text-brass-light mb-4">
            {guild.supplies} suministros del gremio
            {currentStatus && <> · Estado: {currentStatus.name}</>}
          </p>

          {guild.description && (
            <div className="surface-parchment p-4 max-w-xl">
              <p className="font-label text-2xs font-bold uppercase tracking-widest text-brass mb-1.5">Novedades del gremio</p>
              <p className="font-body text-sm text-ink-light whitespace-pre-line">{guild.description}</p>
            </div>
          )}
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-14">
        <GuildStaffSection staff={guildStaff} />

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-parchment">Miembros del gremio</h2>
          <Link href="/rol/characters" className="font-label text-xs uppercase tracking-widest text-brass hover:text-brass-bright underline">
            Mis personajes →
          </Link>
        </div>

        {(characters ?? []).length === 0 ? (
          <p className="font-body italic text-parchment-dark">Todavía no hay aventureros en el gremio.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(characters as unknown as RosterCharacter[]).map((c) => {
              const owner = Array.isArray(c.owner) ? c.owner[0] : c.owner;
              const rank = c.guild_rank_id ? rankById.get(c.guild_rank_id) : computeRank(c.guild_points, ranks ?? []);
              const summary = c.sheet_data?.identity || c.sheet_data?.theme || "";
              return (
                <div key={c.id} className="surface-parchment p-4">
                  <p className="font-label text-sm font-bold text-ink">{c.name}</p>
                  <p className="font-body text-xs text-ink-light mb-1">{owner?.name || "Aventurero"}</p>
                  {rank && (
                    <p className="font-label text-2xs uppercase tracking-wide text-brass mb-1">{rank.name}</p>
                  )}
                  {summary && <p className="font-body text-xs text-ink-light line-clamp-2">{summary}</p>}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
