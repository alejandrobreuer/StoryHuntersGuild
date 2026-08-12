import { redirect } from "next/navigation";
import Image from "next/image";
import { Shield, Sparkles, Crown, Gem, Calendar } from "lucide-react";
import { getSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/features";
import { levelProgress } from "@/lib/gamification/progression";
import { currentRank, nextRank } from "@/lib/gamification/ranks";
import { PasswordSection } from "@/components/profile/PasswordSection";
import { DisplayNameEditor } from "@/components/profile/DisplayNameEditor";
import { QuestLedger, type LedgerQuest } from "@/components/profile/QuestLedger";
import { RankTrack } from "@/components/profile/RankTrack";
import { formatDate } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { ShgRank, QuestType } from "@/types/database";

export const metadata = { title: "Mi perfil — Story Hunters Guild" };
export const dynamic = "force-dynamic";

const SUBSCRIBER_PERKS = [
  "Entrada con descuento en cada visita",
  "Descuento en bebidas y comida de la cafetería",
  "Podés traer a un amigo nuevo con descuento en su entrada",
  "Insignia cosmética especial en tu Ficha de Aventurero",
  "Acceso prioritario para anotarte a eventos populares",
];

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export default async function ProfilePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/sign-in?next=/profile");

  const admin = createAdminClient();
  const features = await getFeatureFlags();

  const [
    { data: user },
    { data: ranks },
    { data: badges },
    { data: rewards },
    { data: activeQuests },
    { data: myCompletions },
    { data: attendedBookings },
    { data: staffAccount },
  ] = await Promise.all([
    admin
      .from("shg_users")
      .select("email, name, password_hash, xp, rp, is_subscriber, subscriber_since, created_at")
      .eq("id", sessionUser.id)
      .maybeSingle(),
    features.ranks
      ? admin.from("shg_ranks").select("*").order("rp_required")
      : Promise.resolve({ data: [] as ShgRank[] }),
    features.quests
      ? admin.from("shg_user_badges").select("awarded_at, badge:shg_badges(id, name, description, icon, icon_url)").eq("user_id", sessionUser.id).order("awarded_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    features.quests
      ? admin
          .from("shg_quest_rewards")
          .select("awarded_xp, awarded_rp, awarded_at, quest:shg_quests(id, title, type)")
          .eq("user_id", sessionUser.id)
          .order("awarded_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    features.quests
      ? admin
          .from("shg_quests")
          .select("id, title, narrative, type, reward_xp, reward_rp, goal_count, badge:shg_badges(name)")
          .eq("status", "active")
      : Promise.resolve({ data: [] }),
    features.quests
      ? admin.from("shg_quest_completions").select("quest_id, contribution_amount").eq("user_id", sessionUser.id)
      : Promise.resolve({ data: [] }),
    admin.from("shg_bookings").select("id").eq("user_id", sessionUser.id).eq("attended", true),
    admin
      .from("shg_admin_users")
      .select("is_active, role:shg_security_roles(name)")
      .eq("email", sessionUser.email)
      .maybeSingle(),
  ]);

  const staffRole = staffAccount?.is_active ? one(staffAccount.role)?.name ?? null : null;

  const xp = user?.xp ?? 0;
  const rp = user?.rp ?? 0;
  const progress = levelProgress(xp);
  const rank = currentRank(rp, ranks ?? []);
  const upcoming = nextRank(rp, ranks ?? []);

  // ─── Quest Ledger: active quests + this user's status on each ────────────
  const guildQuestIds = (activeQuests ?? []).filter((q) => q.type === "guild").map((q) => q.id);
  const { data: guildCompletions } = guildQuestIds.length > 0
    ? await admin.from("shg_quest_completions").select("quest_id, contribution_amount").in("quest_id", guildQuestIds)
    : { data: [] as { quest_id: string; contribution_amount: number }[] };

  const rewardedQuestIds = new Set(
    (rewards ?? []).map((r) => one(r.quest)?.id).filter((id): id is string => Boolean(id))
  );
  const myContributions = new Map<string, number>();
  for (const c of myCompletions ?? []) {
    myContributions.set(c.quest_id, (myContributions.get(c.quest_id) ?? 0) + c.contribution_amount);
  }
  const guildTotals = new Map<string, number>();
  for (const c of guildCompletions ?? []) {
    guildTotals.set(c.quest_id, (guildTotals.get(c.quest_id) ?? 0) + c.contribution_amount);
  }

  const ledger: LedgerQuest[] = (activeQuests ?? []).map((q) => {
    const badge = one(q.badge);
    const mine = myContributions.get(q.id) ?? 0;
    const isDone = rewardedQuestIds.has(q.id);
    return {
      id: q.id,
      title: q.title,
      narrative: q.narrative,
      type: q.type as QuestType,
      reward_xp: q.reward_xp,
      reward_rp: q.reward_rp,
      badge: badge ? { name: badge.name } : null,
      status: isDone ? "done" : q.type === "guild" && mine > 0 ? "in_progress" : "available",
      guild: q.type === "guild" ? { mine, guildTotal: guildTotals.get(q.id) ?? 0, goal: q.goal_count } : null,
    };
  });

  const eventsAttended = attendedBookings?.length ?? 0;
  const questsCompleted = rewards?.length ?? 0;

  const showProgress = features.progression;
  const showRankTrack = features.ranks;
  const showBothTracks = showProgress && showRankTrack;
  const showPatron = features.subscriptions;

  return (
    <main className="bg-gradient-to-b from-parchment to-parchment-dark px-6 py-14">
      <div className="max-w-4xl mx-auto">
      {/* ————— Adventurer Card header ————— */}
      <div className="relative bg-gradient-to-br from-parchment-dark to-parchment-deep border border-brass rounded-md shadow-[0_1px_0_#EFE4CC,0_12px_28px_-14px_rgba(59,42,30,0.45),inset_0_0_0_6px_#EFE4CC] px-7 py-8 flex flex-col md:flex-row items-center text-center gap-6">
          <div className="pointer-events-none absolute top-[10px] left-[18px] right-[18px] h-px bg-brass/60" />
          <div className="pointer-events-none absolute bottom-[10px] left-[18px] right-[18px] h-px bg-brass/60" />

          <div className="shrink-0 relative size-24 md:size-28 flex items-center justify-center">
            {rank?.icon_url ? (
              <Image src={rank.icon_url} alt="" fill className="object-contain" sizes="112px" />
            ) : (
              <Shield size={64} className="text-crimson" strokeWidth={1.25} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-label text-[12px] uppercase tracking-[0.14em] text-[#A6772F] mb-1">
              {showRankTrack && rank ? `Aventurero Rango ${rank.name}` : "Aventurero del Gremio"}
            </p>
            <DisplayNameEditor currentName={user?.name ?? null} fallback={user?.email ?? sessionUser.email} />
            {user?.created_at && (
              <p className="font-body italic text-[#7A5433] text-[15px] mt-0.5">
                Miembro del Gremio desde {formatDate(user.created_at)}
              </p>
            )}
            {staffRole && (
              <p className="mt-1.5">
                <span className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-brass/15 text-brass">
                  Personal del gremio · {staffRole}
                </span>
              </p>
            )}
          </div>

          {showProgress && (
            <div className="text-center shrink-0">
              <p className="font-display text-4xl text-crimson leading-none">{progress.level}</p>
              <p className="font-label text-xs tracking-widest text-leather-light uppercase mt-1.5">Nivel</p>
            </div>
          )}
      </div>

      {/* ————— Dual progression: Level (personal) | Rank (community) ————— */}
      {(showProgress || showRankTrack) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 mt-6">
          {showProgress && (
            <div className={cn(
              "bg-white/35 border border-brass/50 px-5 pt-4 pb-5",
              showBothTracks ? "rounded-t-md md:rounded-tr-none" : "rounded-t-md md:col-span-2"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={15} className="text-crimson" />
                <h2 className="font-display text-sm text-ink">Crecimiento personal</h2>
              </div>
              <p className="font-body text-xs text-leather-light mb-3">Se gana jugando y completando misiones.</p>
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-label text-2xs text-ink">Nivel {progress.level} → {progress.level + 1}</span>
                <span className="font-label text-2xs text-leather-light">{progress.xpIntoLevel} / {progress.xpForLevel} XP</span>
              </div>
              <div className="h-2.5 bg-parchment-deep rounded-full border border-brass/40 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brass-light to-crimson" style={{ width: `${(progress.xpIntoLevel / progress.xpForLevel) * 100}%` }} />
              </div>
            </div>
          )}

          {showRankTrack && (
            <div className={cn(
              "bg-white/50 border border-brass/50 px-5 pt-4 pb-5",
              showBothTracks ? "rounded-t-md md:border-l-0" : "rounded-t-md md:col-span-2"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Crown size={15} className="text-crimson" />
                <h2 className="font-display text-sm text-ink">Posición en el Gremio</h2>
              </div>
              <p className="font-body text-xs text-leather-light mb-3">Se gana en Misiones de Gremio y de Evento.</p>
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-label text-2xs text-ink">
                  {rank ? rank.name : "Sin rango"}{upcoming ? ` → ${upcoming.name}` : ""}
                </span>
                <span className="font-label text-2xs text-leather-light">
                  {rp}{upcoming ? ` / ${upcoming.rp_required} RP` : " RP"}
                </span>
              </div>
              <div className="h-2.5 bg-parchment-deep rounded-full border border-brass/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-leather to-crimson"
                  style={{
                    width: upcoming
                      ? `${Math.min(100, ((rp - (rank?.rp_required ?? 0)) / (upcoming.rp_required - (rank?.rp_required ?? 0))) * 100)}%`
                      : "100%",
                  }}
                />
              </div>
            </div>
          )}

          {showRankTrack && (ranks?.length ?? 0) > 0 && (
            <div className="col-span-1 md:col-span-2 bg-parchment-dark border border-brass/50 border-t-0 rounded-b-md px-4 py-3">
              <RankTrack ranks={ranks ?? []} rp={rp} />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 mt-8">
        {/* ————— Quest Ledger ————— */}
        {features.quests && (
          <section>
            <h2 className="font-display text-xl text-ink mb-3">Registro de Misiones</h2>
            <QuestLedger quests={ledger} />
          </section>
        )}

        {/* ————— Badges & Tokens ————— */}
        {features.quests && (
          <section>
            <h2 className="font-display text-xl text-ink mb-3">Insignias y Tokens</h2>
            {(badges?.length ?? 0) === 0 ? (
              <p className="font-body italic text-sm text-ink-light">Todavía no ganaste ninguna insignia.</p>
            ) : (
              <div className="flex gap-5 overflow-x-auto pb-1">
                {(badges ?? []).map((b, i) => {
                  const badge = one(b.badge);
                  if (!badge) return null;
                  return (
                    <div key={i} className="flex flex-col items-center shrink-0 text-center" style={{ minWidth: 84 }}>
                      <div className="relative size-14 rounded-full bg-gradient-to-br from-brass to-ink border-2 border-brass flex items-center justify-center shadow-parchment overflow-hidden text-xl">
                        {badge.icon_url ? (
                          <Image src={badge.icon_url} alt="" fill className="object-cover" sizes="56px" />
                        ) : (
                          <span className="text-parchment">{badge.icon || "🏅"}</span>
                        )}
                      </div>
                      <p className="font-label text-2xs text-ink mt-1.5 leading-tight">{badge.name}</p>
                      {badge.description && (
                        <p className="font-body text-2xs text-ink-light italic leading-tight">{badge.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ————— Patron status + Guild Record ————— */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {showPatron && (
            <div className="bg-leather rounded-md px-5 py-4 shadow-[inset_0_0_0_1px_rgba(169,121,58,0.5)]">
              <div className="flex items-center gap-2 mb-1.5">
                <Gem size={15} className="text-brass-light" />
                <h3 className="font-display text-sm text-parchment">Patrón del Gremio</h3>
              </div>
              {user?.is_subscriber ? (
                <>
                  <p className="font-body text-sm text-parchment-dark">
                    Apoyando al gremio{user.subscriber_since ? ` desde ${formatDate(user.subscriber_since)}` : ""}.
                  </p>
                  <ul className="font-body text-xs text-parchment-dark/80 mt-2 flex flex-col gap-0.5 list-disc list-inside">
                    {SUBSCRIBER_PERKS.map((perk) => <li key={perk}>{perk}</li>)}
                  </ul>
                </>
              ) : (
                <p className="font-body text-sm text-parchment-dark">
                  Todavía no sos Patrón del Gremio. Consultá con un Asistente del Gremio en tu próxima
                  visita para sumarte.
                </p>
              )}
            </div>
          )}

          <div className={cn("surface-parchment px-5 py-4", !showPatron && "md:col-span-2")}>
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar size={15} className="text-crimson" />
              <h3 className="font-display text-sm text-ink">Historial del Gremio</h3>
            </div>
            <div className="flex justify-between font-body text-sm text-ink-light">
              <span>Eventos asistidos</span>
              <span className="font-label text-ink">{eventsAttended}</span>
            </div>
            {features.quests && (
              <div className="flex justify-between font-body text-sm text-ink-light mt-1">
                <span>Misiones completadas</span>
                <span className="font-label text-ink">{questsCompleted}</span>
              </div>
            )}
          </div>
        </section>

        {/* ————— Cuenta ————— */}
        <section className="surface-parchment p-6">
          <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-3">
            Cuenta
          </h2>
          <p className="font-body text-sm text-ink mb-4">
            <span className="text-ink-light">Email:</span> {user?.email ?? sessionUser.email}
          </p>
          <PasswordSection hasPassword={Boolean(user?.password_hash)} />
        </section>
      </div>
      </div>
    </main>
  );
}
