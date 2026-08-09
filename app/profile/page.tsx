import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/features";
import { levelProgress } from "@/lib/gamification/progression";
import { currentRank, nextRank } from "@/lib/gamification/ranks";
import { PasswordForm } from "@/components/profile/PasswordForm";
import { formatDate } from "@/lib/formatting";
import type { ShgRank } from "@/types/database";

export const metadata = { title: "Mi perfil — Story Hunters Guild" };
export const dynamic = "force-dynamic";

const SUBSCRIBER_PERKS = [
  "Entrada con descuento en cada visita",
  "Descuento en bebidas y comida de la cafetería",
  "Podés traer a un amigo nuevo con descuento en su entrada",
  "Insignia cosmética especial en tu Ficha de Aventurero",
  "Acceso prioritario para anotarte a eventos populares",
];

export default async function ProfilePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/sign-in?next=/profile");

  const admin = createAdminClient();
  const features = await getFeatureFlags();

  const [{ data: user }, { data: ranks }, { data: badges }, { data: rewards }] = await Promise.all([
    admin
      .from("shg_users")
      .select("email, name, password_hash, xp, rp, is_subscriber, subscriber_since, created_at")
      .eq("id", sessionUser.id)
      .maybeSingle(),
    features.ranks
      ? admin.from("shg_ranks").select("*").order("rp_required")
      : Promise.resolve({ data: [] as ShgRank[] }),
    features.quests
      ? admin.from("shg_user_badges").select("awarded_at, badge:shg_badges(id, name, description, icon)").eq("user_id", sessionUser.id).order("awarded_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    features.quests
      ? admin
          .from("shg_quest_rewards")
          .select("awarded_xp, awarded_rp, awarded_at, quest:shg_quests(id, title, type)")
          .eq("user_id", sessionUser.id)
          .order("awarded_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const xp = user?.xp ?? 0;
  const rp = user?.rp ?? 0;
  const progress = levelProgress(xp);
  const rank = currentRank(rp, ranks ?? []);
  const upcoming = nextRank(rp, ranks ?? []);

  return (
    <main className="max-w-2xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment text-center mb-8">Mi perfil</h1>

      <div className="flex flex-col gap-4">
        <section className="surface-parchment p-6">
          <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-3">
            Cuenta
          </h2>
          <dl className="font-body text-sm text-ink flex flex-col gap-1">
            <div><span className="text-ink-light">Email:</span> {user?.email ?? sessionUser.email}</div>
            {user?.name && <div><span className="text-ink-light">Nombre:</span> {user.name}</div>}
            {user?.created_at && (
              <div><span className="text-ink-light">Miembro desde:</span> {formatDate(user.created_at)}</div>
            )}
          </dl>
        </section>

        {features.progression && (
          <section className="surface-parchment p-6">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light">
                Progresión
              </h2>
              <span className="font-display text-lg text-ink">Nivel {progress.level}</span>
            </div>
            <div className="h-2.5 w-full bg-parchment-dark/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-brass transition-all"
                style={{ width: `${(progress.xpIntoLevel / progress.xpForLevel) * 100}%` }}
              />
            </div>
            <p className="font-body text-2xs text-ink-light mt-1">
              {progress.xpIntoLevel} / {progress.xpForLevel} XP para el próximo nivel · {xp} XP total
            </p>
          </section>
        )}

        {features.ranks && (
          <section className="surface-parchment p-6">
            <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-2">
              Rango
            </h2>
            <p className="font-display text-lg text-ink">{rank ? rank.name : "Sin rango todavía"}</p>
            {rank?.benefit && <p className="font-body text-xs text-ink-light mt-0.5">{rank.benefit}</p>}
            <p className="font-body text-2xs text-ink-light mt-2">
              {rp} RP total
              {upcoming && ` · ${upcoming.rp_required - rp} RP para "${upcoming.name}"`}
            </p>
          </section>
        )}

        {features.quests && (badges?.length ?? 0) > 0 && (
          <section className="surface-parchment p-6">
            <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-3">
              Insignias
            </h2>
            <div className="flex flex-wrap gap-2">
              {(badges ?? []).map((b, i) => {
                const badge = Array.isArray(b.badge) ? b.badge[0] : b.badge;
                if (!badge) return null;
                return (
                  <div key={i} className="flex items-center gap-1.5 font-label text-2xs uppercase tracking-wide px-2.5 py-1.5 rounded-sm bg-brass/15 text-brass" title={badge.description ?? undefined}>
                    <span>{badge.icon || "🏅"}</span>
                    {badge.name}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {features.quests && (
          <section className="surface-parchment p-6">
            <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-3">
              Misiones completadas
            </h2>
            {(rewards?.length ?? 0) === 0 ? (
              <p className="font-body italic text-sm text-ink-light">Todavía no completaste ninguna misión.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {(rewards ?? []).map((r, i) => {
                  const quest = Array.isArray(r.quest) ? r.quest[0] : r.quest;
                  return (
                    <div key={i} className="flex items-center justify-between font-body text-sm text-ink border-b border-border/60 pb-2 last:border-0 last:pb-0">
                      <span>{quest?.title ?? "Misión"}</span>
                      <span className="text-xs text-ink-light">+{r.awarded_xp} XP · +{r.awarded_rp} RP</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {features.subscriptions && (
          <section className="surface-parchment p-6">
            <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-3">
              Suscripción
            </h2>
            {user?.is_subscriber ? (
              <>
                <p className="font-body text-sm text-moss-dark font-semibold">
                  Sos Patrón del Gremio{user.subscriber_since ? ` desde ${formatDate(user.subscriber_since)}` : ""}.
                </p>
                <ul className="font-body text-xs text-ink-light mt-2 flex flex-col gap-1 list-disc list-inside">
                  {SUBSCRIBER_PERKS.map((perk) => <li key={perk}>{perk}</li>)}
                </ul>
              </>
            ) : (
              <p className="font-body text-sm text-ink-light">
                Todavía no sos Patrón del Gremio. Consultá con un Asistente del Gremio en tu próxima
                visita para sumarte y apoyar al gremio.
              </p>
            )}
          </section>
        )}

        <section className="surface-parchment p-6">
          <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-3">
            {user?.password_hash ? "Cambiar contraseña" : "Crear una contraseña"}
          </h2>
          {!user?.password_hash && (
            <p className="font-body text-xs text-ink-light mb-3">
              Tu cuenta todavía usa solo el enlace mágico para entrar. Podés crear una contraseña para
              iniciar sesión más rápido la próxima vez.
            </p>
          )}
          <PasswordForm hasPassword={Boolean(user?.password_hash)} />
        </section>
      </div>
    </main>
  );
}
