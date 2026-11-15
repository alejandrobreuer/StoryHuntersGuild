import { redirect } from "next/navigation";
import Image from "next/image";
import { Shield, Sparkles, Crown, Gem, Calendar, Award, ScrollText } from "lucide-react";
import { getSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/features";
import { levelProgress, xpForLevel } from "@/lib/gamification/progression";
import { currentRank, nextRank } from "@/lib/gamification/ranks";
import { sheetStats } from "@/lib/profile/sheetStats";
import { PasswordSection } from "@/components/profile/PasswordSection";
import { DisplayNameEditor } from "@/components/profile/DisplayNameEditor";
import { QuestLedger, type LedgerQuest } from "@/components/profile/QuestLedger";
import { SheetPanel, SheetHeading, SheetLabel } from "@/components/profile/sheet/SheetPanel";
import { SegmentBar } from "@/components/profile/sheet/SegmentBar";
import { InfoDialog } from "@/components/profile/sheet/InfoDialog";
import { RankLadder } from "@/components/profile/sheet/RankLadder";
import { BenefitCard, type SheetBenefit } from "@/components/profile/sheet/BenefitCard";
import { InviteCodes, type ProfileInviteCode } from "@/components/profile/sheet/InviteCodes";
import { BadgeSlot, type SheetBadge } from "@/components/profile/sheet/BadgeSlot";
import { playerBenefits, ensureInviteCodes, benefitStatuses, type BenefitWithRank } from "@/lib/benefits";
import { describeBenefit } from "@/lib/benefitLabels";
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

/** Badge grid: 6 per row, at least two rows, padded with empty slots. */
const BADGE_COLUMNS = 6;
const MIN_BADGE_SLOTS = 12;

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

  // ─── Benefits unlocked by rank / level ─────────────────────────────────────
  const benefitInfo = await playerBenefits(admin, sessionUser.id);
  const unlockedIds = new Set(benefitInfo.unlocked.map((b) => b.id));
  const [inviteCodes, statuses] = await Promise.all([
    ensureInviteCodes(admin, sessionUser.id, benefitInfo.unlocked),
    benefitStatuses(admin, sessionUser.id, benefitInfo.unlocked),
  ]);

  // What's still missing for a locked benefit ("Nivel 8 · te faltan 2 niveles (175 XP)").
  function missing(b: BenefitWithRank): string {
    if (b.unlock_type === "rank") {
      return `Rango ${b.rank?.name ?? ""} · te faltan ${Math.max(0, (b.rank?.rp_required ?? 0) - rp)} RP`;
    }
    const target = b.min_level ?? 0;
    const levels = Math.max(0, target - progress.level);
    return `Nivel ${target} · te faltan ${levels} ${levels === 1 ? "nivel" : "niveles"} (${Math.max(0, xpForLevel(target) - xp)} XP)`;
  }
  const benefitOrder = (b: BenefitWithRank) => (b.unlock_type === "rank" ? b.rank?.rp_required ?? 0 : b.min_level ?? 0);
  function benefitsOf(type: "level" | "rank") {
    const list = benefitInfo.all.filter((b) => b.unlock_type === type).sort((a, b) => benefitOrder(a) - benefitOrder(b));
    const toCard = (b: BenefitWithRank, locked: boolean): SheetBenefit => ({
      id: b.id,
      name: b.name,
      summary: describeBenefit(b),
      description: b.description,
      status: locked ? missing(b) : statuses.get(b.id) ?? null,
    });
    const ids = new Set(list.map((b) => b.id));
    const invites: ProfileInviteCode[] = inviteCodes
      .filter((c) => ids.has(c.benefit_id))
      .map((c) => ({ code: c.code, discount: c.discount_percent, expiresAt: c.expires_at, used: Boolean(c.used_at) }));
    return {
      exists:   list.length > 0,
      unlocked: list.filter((b) => unlockedIds.has(b.id)).map((b) => toCard(b, false)),
      locked:   list.filter((b) => !unlockedIds.has(b.id)).map((b) => toCard(b, true)),
      invites,
    };
  }
  const levelBenefits = benefitsOf("level");
  const rankBenefits = benefitsOf("rank");

  // ─── Badges ───────────────────────────────────────────────────────────────
  const earnedBadges: SheetBadge[] = (badges ?? []).flatMap((b) => {
    const badge = one(b.badge);
    return badge ? [{ id: badge.id, name: badge.name, description: badge.description, iconUrl: badge.icon_url, icon: badge.icon }] : [];
  });
  const badgeSlots = Math.max(MIN_BADGE_SLOTS, Math.ceil(earnedBadges.length / BADGE_COLUMNS) * BADGE_COLUMNS);

  const eventsAttended = attendedBookings?.length ?? 0;
  const questsCompleted = rewards?.length ?? 0;

  const showProgress = features.progression;
  const showRanks = features.ranks;
  const showPatron = features.subscriptions;
  const stats = sheetStats(progress.level);
  const xpToNext = progress.xpForLevel - progress.xpIntoLevel;
  const hasRanks = (ranks?.length ?? 0) > 0;

  const rankIntro = (
    <>
      {rank ? `Sos ${rank.name} con ${rp} RP.` : `Todavía no tenés rango: llevás ${rp} RP.`}{" "}
      Cada rango se gana con RP de Misiones de Gremio y de Evento.
    </>
  );

  return (
    <main className="bg-gradient-to-b from-parchment to-parchment-dark px-4 sm:px-6 py-10 sm:py-14 font-body text-ink">
      <div className="max-w-5xl mx-auto flex flex-col gap-5 sm:gap-6">

        {/* ————— 1. Character card ————— */}
        <SheetPanel framed aria-label="Ficha del aventurero">
          <div className="flex flex-col md:flex-row md:flex-wrap items-center md:items-center gap-7 md:gap-x-9 px-6 py-8 sm:px-10">
            {/* Emblem */}
            <div className="shrink-0 flex flex-col items-center gap-3.5 md:w-[150px]">
              <div className="mt-3 mb-1.5 size-24 sm:size-28 rotate-45 border-2 border-brass bg-gradient-to-br from-parchment-dark to-parchment-deep shadow-[inset_0_0_0_4px_rgba(239,228,204,0.6)] flex items-center justify-center">
                <div className="-rotate-45 relative size-16 sm:size-[72px] flex items-center justify-center">
                  {showRanks && rank?.icon_url ? (
                    <Image src={rank.icon_url} alt={`Emblema de rango ${rank.name}`} fill className="object-contain" sizes="72px" />
                  ) : (
                    <Shield size={48} className="text-crimson" strokeWidth={1.25} aria-hidden />
                  )}
                </div>
              </div>
              {showProgress && (
                <span className="bg-crimson text-parchment border border-crimson font-display font-semibold text-xs tracking-[0.16em] px-4 py-1">
                  NIVEL {progress.level}
                </span>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 basis-[280px] min-w-0 text-center md:text-left">
              <SheetLabel className="text-[11px] tracking-[0.2em]">
                {showRanks && rank ? `Aventurero Rango ${rank.name}` : "Aventurero del Gremio"}
              </SheetLabel>
              <DisplayNameEditor
                currentName={user?.name ?? null}
                fallback={user?.email ?? sessionUser.email}
                className="justify-center md:justify-start mt-1.5 mb-1"
                titleClassName="text-3xl sm:text-[40px] leading-tight break-words"
              />
              {user?.created_at && (
                <p className="font-body italic text-ink-light text-[17px]">
                  Miembro del Gremio desde {formatDate(user.created_at)}
                </p>
              )}
              {staffRole && (
                <p className="mt-3.5">
                  <span className="inline-block font-display text-[11px] uppercase tracking-[0.12em] text-brass-dark border border-brass bg-brass/15 px-2.5 py-1">
                    Personal del gremio · {staffRole}
                  </span>
                </p>
              )}
            </div>

            {/* Cosmetic stats — grow with level, no data behind them */}
            {showProgress && (
              <div className="w-full md:flex-1 md:basis-[300px] md:min-w-[260px] flex flex-col gap-3.5">
                {stats.map((s) => (
                  <div key={s.key}>
                    <div className="flex justify-between items-baseline font-display font-semibold text-xs uppercase tracking-[0.12em] text-ink-heading mb-1.5">
                      <span>{s.label}</span>
                      <span className="text-ink-light">{s.max} / {s.max}</span>
                    </div>
                    <SegmentBar value={1} tone={s.tone} label={`${s.label}: ${s.max} de ${s.max}`} />
                  </div>
                ))}
                <p className="font-body italic text-sm text-ink-light">Vida, Inspiración y Aguante crecen con cada nivel.</p>
              </div>
            )}
          </div>
        </SheetPanel>

        {/* ————— 2. Progress: level (personal) | rank (community) ————— */}
        {(showProgress || showRanks) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {showProgress && (
              <SheetPanel className={cn("px-5 py-5 sm:px-6", !showRanks && "md:col-span-2")}>
                <SheetHeading icon={<Sparkles size={20} strokeWidth={1.8} className="text-crimson" aria-hidden />}>
                  Crecimiento personal
                </SheetHeading>
                <p className="font-body italic text-[15px] text-ink-light mt-0.5 mb-4">Se gana jugando y completando misiones.</p>
                <div className="flex justify-between font-display text-xs uppercase tracking-[0.08em] text-brass-dark mb-1.5">
                  <span>Nivel {progress.level} → {progress.level + 1}</span>
                  <span>{progress.xpIntoLevel} / {progress.xpForLevel} XP</span>
                </div>
                <SegmentBar
                  value={progress.xpIntoLevel / progress.xpForLevel}
                  tone="gold"
                  label={`${progress.xpIntoLevel} de ${progress.xpForLevel} XP para el nivel ${progress.level + 1}`}
                  className="h-4"
                />
                <p className="font-body text-base mt-2.5">
                  Te faltan <strong>{xpToNext} XP</strong> para el Nivel {progress.level + 1}.
                </p>
              </SheetPanel>
            )}

            {showRanks && (
              <SheetPanel className={cn("px-5 py-5 sm:px-6", !showProgress && "md:col-span-2")}>
                <SheetHeading
                  icon={<Crown size={20} strokeWidth={1.8} className="text-crimson" aria-hidden />}
                  action={hasRanks && (
                    <InfoDialog label="Ver todos los rangos y el próximo" title="Posición en el Gremio" intro={rankIntro} wide>
                      <RankLadder ranks={ranks ?? []} rp={rp} />
                      {upcoming ? (
                        <div className="flex justify-between flex-wrap gap-1.5 font-body text-base">
                          <span>
                            Próximo rango: <strong>{upcoming.name}</strong>
                            {rank && ` (+${upcoming.rp_required - rank.rp_required} RP desde ${rank.name})`}
                          </span>
                          <span>Te faltan <strong>{upcoming.rp_required - rp} RP</strong></span>
                        </div>
                      ) : (
                        <p className="font-body text-base">Llegaste al rango más alto del gremio.</p>
                      )}
                    </InfoDialog>
                  )}
                >
                  Posición en el Gremio
                </SheetHeading>
                <p className="font-body italic text-[15px] text-ink-light mt-0.5 mb-4">Se gana en Misiones de Gremio y de Evento.</p>
                <SheetLabel className="mb-1">Rango actual</SheetLabel>
                <div className="flex items-baseline flex-wrap gap-x-3.5 gap-y-1">
                  <span className="font-display font-semibold text-3xl leading-tight text-crimson">{rank ? rank.name : "Sin rango"}</span>
                  <span className="font-body text-base text-ink-light">{rp} RP acumulados</span>
                </div>
                {hasRanks && (
                  <p className="font-body text-base mt-2.5">
                    Tocá <strong>(i)</strong> para ver todos los rangos y los RP que faltan para el próximo.
                  </p>
                )}
              </SheetPanel>
            )}
          </div>
        )}

        {/* ————— 3. Benefits: by level | by rank ————— */}
        {(levelBenefits.exists || rankBenefits.exists) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
            {levelBenefits.exists && (
              <BenefitsPanel
                title="Beneficios de Nivel"
                kind="nivel"
                data={levelBenefits}
                wide={!rankBenefits.exists}
              />
            )}
            {rankBenefits.exists && (
              <BenefitsPanel
                title="Beneficios de Rango"
                kind="rango"
                data={rankBenefits}
                wide={!levelBenefits.exists}
              />
            )}
          </div>
        )}

        {/* ————— 4. Badges + Patron / Record ————— */}
        <div className={cn("grid grid-cols-1 gap-5 sm:gap-6 items-stretch", features.quests && "lg:grid-cols-[2fr_1fr]")}>
          {features.quests && (
            <SheetPanel className="px-5 py-5 sm:px-6">
              <div className="flex items-baseline justify-between gap-3">
                <SheetHeading icon={<Award size={20} strokeWidth={1.8} className="text-crimson" aria-hidden />}>Insignias</SheetHeading>
                <SheetLabel>{earnedBadges.length} {earnedBadges.length === 1 ? "obtenida" : "obtenidas"}</SheetLabel>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-2.5 gap-y-4 mt-4">
                {Array.from({ length: badgeSlots }, (_, i) => (
                  <BadgeSlot key={earnedBadges[i]?.id ?? `empty-${i}`} badge={earnedBadges[i] ?? null} />
                ))}
              </div>
              <p className="font-body italic text-sm text-ink-light mt-4">
                {earnedBadges.length === 0 && "Todavía no ganaste ninguna insignia. "}
                Las insignias se ganan completando misiones.
              </p>
            </SheetPanel>
          )}

          <div className={cn("grid grid-cols-1 gap-5 sm:gap-6 content-start", !features.quests && showPatron && "md:grid-cols-2")}>
            {showPatron && (
              <SheetPanel className="px-5 py-5">
                <SheetHeading icon={<Gem size={18} strokeWidth={1.8} className="text-crimson" aria-hidden />} className="mb-1.5">
                  Patrón del Gremio
                </SheetHeading>
                {user?.is_subscriber ? (
                  <>
                    <p className="font-body text-base">
                      Apoyando al gremio{user.subscriber_since ? ` desde ${formatDate(user.subscriber_since)}` : ""}.
                    </p>
                    <ul className="font-body text-sm text-ink-light mt-2 flex flex-col gap-0.5 list-disc list-inside">
                      {SUBSCRIBER_PERKS.map((perk) => <li key={perk}>{perk}</li>)}
                    </ul>
                  </>
                ) : (
                  <p className="font-body text-base">
                    Todavía no sos Patrón del Gremio. Consultá con un Asistente del Gremio en tu próxima
                    visita para sumarte.
                  </p>
                )}
              </SheetPanel>
            )}

            <SheetPanel className="px-5 py-5">
              <SheetHeading icon={<Calendar size={18} strokeWidth={1.8} className="text-crimson" aria-hidden />} className="mb-2">
                Historial del Gremio
              </SheetHeading>
              <div className="flex justify-between py-1 font-body text-base">
                <span>Eventos asistidos</span>
                <strong className="text-ink-heading">{eventsAttended}</strong>
              </div>
              {features.quests && (
                <div className="flex justify-between py-1 border-t border-dashed border-parchment-deep font-body text-base">
                  <span>Misiones completadas</span>
                  <strong className="text-ink-heading">{questsCompleted}</strong>
                </div>
              )}
            </SheetPanel>
          </div>
        </div>

        {/* ————— 5. Quest Ledger ————— */}
        {features.quests && (
          <SheetPanel className="px-5 py-5 sm:px-6">
            <SheetHeading icon={<ScrollText size={20} strokeWidth={1.8} className="text-crimson" aria-hidden />} className="mb-3.5">
              Registro de Misiones
            </SheetHeading>
            <QuestLedger quests={ledger} />
          </SheetPanel>
        )}

        {/* ————— 6. Account ————— */}
        <section className="border border-parchment-deep bg-white/30 px-5 py-4 sm:px-6 flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <SheetLabel className="text-ink-light text-[11px] tracking-[0.16em]">Cuenta</SheetLabel>
            <p className="font-body text-[15px] break-all">{user?.email ?? sessionUser.email}</p>
          </div>
          <PasswordSection hasPassword={Boolean(user?.password_hash)} email={user?.email ?? sessionUser.email} />
        </section>
      </div>
    </main>
  );
}

function BenefitsPanel({ title, kind, data, wide }: {
  title: string;
  kind: "nivel" | "rango";
  data: { unlocked: SheetBenefit[]; locked: SheetBenefit[]; invites: ProfileInviteCode[] };
  wide: boolean;
}) {
  return (
    <SheetPanel className={cn("px-5 py-5 sm:px-6", wide && "md:col-span-2")}>
      <div className="flex flex-col gap-3">
        <SheetHeading
          action={
            <InfoDialog
              label={`Ver próximos beneficios de ${kind}`}
              title={`Próximos beneficios de ${kind}`}
              intro={`Lo que desbloqueás al subir de ${kind}.`}
            >
              {data.locked.length === 0 ? (
                <p className="font-body text-base">Ya desbloqueaste todos los beneficios de {kind}.</p>
              ) : (
                data.locked.map((b) => <BenefitCard key={b.id} benefit={b} locked />)
              )}
            </InfoDialog>
          }
        >
          {title}
        </SheetHeading>

        {data.unlocked.length === 0 ? (
          <p className="font-body italic text-[15px] text-ink-light">
            Todavía no desbloqueaste beneficios de {kind}. Tocá (i) para ver qué viene.
          </p>
        ) : (
          data.unlocked.map((b) => <BenefitCard key={b.id} benefit={b} />)
        )}

        {data.invites.length > 0 && <InviteCodes invites={data.invites} />}
      </div>
    </SheetPanel>
  );
}
