import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Lock, Unlock, Shield } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeRank } from "@/lib/rol/rank";
import { cn } from "@/lib/utils";
import type { ShgRolGuildFeature, ShgRolGuildRank } from "@/types/database";

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
  const admin = createAdminClient();
  const [{ data: guild }, { data: features }, { data: ranks }, { data: characters }] = await Promise.all([
    admin.from("shg_rol_guild").select("*").limit(1).maybeSingle(),
    admin.from("shg_rol_guild_feature").select("*").order("sort_order", { ascending: true }),
    admin.from("shg_rol_guild_rank").select("*").order("points_threshold", { ascending: true }),
    admin
      .from("shg_rol_character")
      .select("id, name, guild_points, guild_rank_id, sheet_data, owner:shg_users(name)")
      .order("guild_points", { ascending: false }),
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

  return (
    <main className="max-w-6xl mx-auto px-6 py-14">
      <div className="grid md:grid-cols-2 gap-10 mb-14">
        <div className="relative aspect-video md:aspect-square surface-parchment overflow-hidden flex items-center justify-center">
          {guild.image_url ? (
            <Image src={guild.image_url} alt={guild.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          ) : (
            <Shield size={64} className="text-leather-light" />
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl text-parchment mb-1">{guild.name}</h1>
          <p className="font-label text-xs uppercase tracking-widest text-brass-light mb-6">
            {guild.supplies} suministros del gremio
          </p>

          <div className="flex flex-col gap-3">
            {featureList.length === 0 ? (
              <p className="font-body italic text-parchment-dark text-sm">Todavía no hay funciones cargadas.</p>
            ) : (
              featureList.map((f) => (
                <div
                  key={f.id}
                  className={cn("surface-parchment p-4", !f.unlocked && "opacity-40 grayscale")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {f.unlocked ? <Unlock size={14} className="text-moss shrink-0" /> : <Lock size={14} className="text-leather-light shrink-0" />}
                    <p className="font-label text-sm font-bold text-ink">{f.title}</p>
                  </div>
                  <p className="font-body text-xs text-ink-light">{f.description}</p>
                  {f.benefit && <p className="font-body text-xs text-brass mt-1.5">{f.benefit}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
  );
}
