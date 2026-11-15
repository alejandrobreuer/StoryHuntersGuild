import { redirect } from "next/navigation";
import Image from "next/image";
import { Users, Shield } from "lucide-react";
import { getSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/features";
import { levelForXp } from "@/lib/gamification/progression";
import { currentRank } from "@/lib/gamification/ranks";
import { SheetPanel } from "@/components/profile/sheet/SheetPanel";
import { cn } from "@/lib/utils";
import type { ShgRank } from "@/types/database";

export const metadata = { title: "Guild — Story Hunters Guild" };
export const dynamic = "force-dynamic";

/** Badges shown per card before collapsing into "+N". */
const MAX_BADGES = 8;

type Badge = { id: string; name: string; icon: string | null; icon_url: string | null };

interface Member {
  id:        string;
  name:      string;
  avatarUrl: string | null;
  xp:        number;
  level:     number;
  rank:      ShgRank | null;
  staffRole: string | null;
  badges:    Badge[];
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

// ─── /guild ─────────────────────────────────────────────────────────────────
// Every member with a display name: staff first, then everyone by level.
// Signed-in players only. Emails are never shown, so accounts without a
// name (e.g. invited but never signed in) are left out.

export default async function GuildPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/sign-in?next=/guild");

  const admin = createAdminClient();
  const features = await getFeatureFlags();

  const [{ data: users }, { data: staff }, { data: ranks }, { data: userBadges }] = await Promise.all([
    admin.from("shg_users").select("id, email, name, avatar_url, xp, rp").not("name", "is", null),
    admin.from("shg_admin_users").select("email, user_id, role:shg_security_roles(name)").eq("is_active", true),
    features.ranks
      ? admin.from("shg_ranks").select("*").order("rp_required")
      : Promise.resolve({ data: [] as ShgRank[] }),
    features.quests
      ? admin.from("shg_user_badges").select("user_id, awarded_at, badge:shg_badges(id, name, icon, icon_url)").order("awarded_at")
      : Promise.resolve({ data: [] as { user_id: string; awarded_at: string; badge: Badge | Badge[] | null }[] }),
  ]);

  // Staff accounts are linked by user_id, or (older ones) by the same email.
  const roleByUser = new Map<string, string>();
  const roleByEmail = new Map<string, string>();
  for (const s of staff ?? []) {
    const role = one(s.role)?.name ?? "Staff";
    if (s.user_id) roleByUser.set(s.user_id, role);
    roleByEmail.set(s.email.toLowerCase(), role);
  }

  const badgesByUser = new Map<string, Badge[]>();
  for (const ub of userBadges ?? []) {
    const badge = one(ub.badge);
    if (!badge) continue;
    badgesByUser.set(ub.user_id, [...(badgesByUser.get(ub.user_id) ?? []), badge]);
  }

  const members: Member[] = (users ?? [])
    .filter((u) => u.name?.trim())
    .map((u) => ({
      id: u.id,
      name: u.name!.trim(),
      avatarUrl: u.avatar_url,
      xp: u.xp,
      level: levelForXp(u.xp),
      rank: currentRank(u.rp, ranks ?? []),
      staffRole: roleByUser.get(u.id) ?? roleByEmail.get(u.email.toLowerCase()) ?? null,
      badges: badgesByUser.get(u.id) ?? [],
    }))
    .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name, "es"));

  const staffMembers = members.filter((m) => m.staffRole);
  const adventurers = members.filter((m) => !m.staffRole);
  const show = { level: features.progression, rank: features.ranks, badges: features.quests };

  return (
    <main className="bg-gradient-to-b from-parchment to-parchment-dark px-4 sm:px-6 py-10 sm:py-14 font-body text-ink">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <header>
          <h1 className="font-display font-semibold text-3xl sm:text-4xl text-ink-heading flex items-center gap-3">
            <Users size={30} strokeWidth={1.6} className="text-crimson" aria-hidden /> Guild
          </h1>
          <p className="font-body italic text-[17px] text-ink-light mt-1">
            Los {members.length} aventureros del gremio.
          </p>
        </header>

        {staffMembers.length > 0 && (
          <MemberSection title="Personal del Gremio" members={staffMembers} show={show} />
        )}
        <MemberSection
          title="Aventureros"
          subtitle={show.level ? "Ordenados por nivel." : undefined}
          members={adventurers}
          show={show}
        />
      </div>
    </main>
  );
}

function MemberSection({ title, subtitle, members, show }: {
  title: string;
  subtitle?: string;
  members: Member[];
  show: { level: boolean; rank: boolean; badges: boolean };
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 border-b border-parchment-deep pb-2 mb-4">
        <h2 className="font-display font-semibold text-xl text-ink-heading">{title}</h2>
        <p className="font-display text-xs uppercase tracking-[0.12em] text-brass-dark">
          {members.length} {members.length === 1 ? "miembro" : "miembros"}
        </p>
      </div>
      {subtitle && <p className="font-body italic text-sm text-ink-light -mt-2 mb-4">{subtitle}</p>}
      {members.length === 0 ? (
        <p className="font-body italic text-ink-light">Todavía no hay nadie acá.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => <MemberCard key={m.id} member={m} show={show} />)}
        </ul>
      )}
    </section>
  );
}

function MemberCard({ member: m, show }: { member: Member; show: { level: boolean; rank: boolean; badges: boolean } }) {
  const extra = m.badges.length - MAX_BADGES;
  return (
    <li>
      <SheetPanel className="h-full px-4 py-4">
        <div className="flex gap-4 items-center">
          <Portrait member={m} showRank={show.rank} />
          <div className="min-w-0">
            <p className="font-display font-semibold text-lg leading-tight text-ink-heading break-words">{m.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {show.level && (
                <span className="bg-crimson text-parchment font-display font-semibold text-[10px] tracking-[0.14em] px-2 py-0.5">
                  NIVEL {m.level}
                </span>
              )}
              {show.rank && (
                <span className="font-display text-[11px] uppercase tracking-[0.1em] text-brass-dark">
                  {m.rank ? `Rango ${m.rank.name}` : "Sin rango"}
                </span>
              )}
            </div>
            {m.staffRole && (
              <span className="inline-block mt-1.5 font-display text-[10px] uppercase tracking-[0.1em] text-brass-dark border border-brass bg-brass/15 px-2 py-0.5">
                {m.staffRole}
              </span>
            )}
          </div>
        </div>

        {show.badges && (
          <div className="mt-3.5 pt-3 border-t border-dashed border-parchment-deep">
            {m.badges.length === 0 ? (
              <p className="font-body italic text-sm text-ink-light">Sin insignias todavía.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5" aria-label={`Insignias de ${m.name}`}>
                {m.badges.slice(0, MAX_BADGES).map((b) => (
                  <li
                    key={b.id}
                    title={b.name}
                    className="relative size-8 rounded-full overflow-hidden bg-gradient-to-br from-brass-light to-brass border border-brass-dark flex items-center justify-center text-sm"
                  >
                    {b.icon_url ? (
                      <Image src={b.icon_url} alt={b.name} fill className="object-cover" sizes="32px" />
                    ) : (
                      <span role="img" aria-label={b.name}>{b.icon || "🏅"}</span>
                    )}
                  </li>
                ))}
                {extra > 0 && (
                  <li className="size-8 rounded-full border border-dashed border-brass flex items-center justify-center font-display text-[10px] font-semibold text-brass-dark" title={`${extra} insignias más`}>
                    +{extra}
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </SheetPanel>
    </li>
  );
}

/** Profile picture, else rank emblem, else the name's initial. */
function Portrait({ member: m, showRank }: { member: Member; showRank: boolean }) {
  const emblem = showRank ? m.rank?.icon_url ?? null : null;
  return (
    <div className={cn(
      "relative size-24 sm:size-28 shrink-0 rounded-full overflow-hidden border-2 border-brass flex items-center justify-center",
      "bg-gradient-to-br from-parchment-dark to-parchment-deep shadow-[inset_0_0_0_4px_rgba(239,228,204,0.6)]"
    )}>
      {m.avatarUrl ? (
        <Image src={m.avatarUrl} alt={`Foto de ${m.name}`} fill className="object-cover" sizes="112px" />
      ) : emblem ? (
        <div className="relative size-14 sm:size-16">
          <Image src={emblem} alt="" fill className="object-contain" sizes="64px" />
        </div>
      ) : m.name ? (
        <span className="font-display font-bold text-4xl text-crimson" aria-hidden>{m.name.charAt(0).toUpperCase()}</span>
      ) : (
        <Shield size={40} className="text-crimson" aria-hidden />
      )}
    </div>
  );
}
