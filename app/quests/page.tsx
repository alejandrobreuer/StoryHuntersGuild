import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/features";
import { formatDateTime } from "@/lib/formatting";

export const metadata = { title: "Misiones — Story Hunters Guild" };
export const dynamic = "force-dynamic";

interface BadgeInfo { id: string; name: string; icon: string | null; }
interface EventInfo { id: string; title: string; slug: string; starts_at: string; }
interface QuestRow {
  id: string; title: string; narrative: string | null; type: "individual" | "party" | "community" | "event";
  reward_xp: number; reward_rp: number; goal_count: number | null;
  badge: BadgeInfo | BadgeInfo[] | null; event: EventInfo | EventInfo[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function QuestCard({ quest }: { quest: QuestRow }) {
  const badge = one(quest.badge);
  return (
    <div className="surface-parchment p-5">
      <p className="font-label text-sm font-bold text-ink">{quest.title}</p>
      {quest.narrative && <p className="font-body text-sm text-ink-light mt-1 leading-relaxed">{quest.narrative}</p>}
      <p className="font-body text-xs text-brass mt-2">
        +{quest.reward_xp} XP · +{quest.reward_rp} RP{badge ? ` · insignia "${badge.name}"` : ""}
      </p>
    </div>
  );
}

export default async function QuestsPage() {
  const features = await getFeatureFlags();
  if (!features.quests) redirect("/");

  const admin = createAdminClient();
  const { data } = await admin
    .from("shg_quests")
    .select("*, badge:shg_badges(id, name, icon), event:shg_events(id, title, slug, starts_at)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const quests = (data ?? []) as unknown as QuestRow[];
  const individualParty = quests.filter((q) => q.type === "individual" || q.type === "party");
  const communityQuests = quests.filter((q) => q.type === "community");
  const eventQuests = quests.filter((q) => q.type === "event");

  const community = await Promise.all(
    communityQuests.map(async (q) => {
      const { data: completions } = await admin
        .from("shg_quest_completions")
        .select("contribution_amount, user:shg_users(id, name, email)")
        .eq("quest_id", q.id);

      const rows = (completions ?? []) as unknown as {
        contribution_amount: number;
        user: { id: string; name: string | null; email: string } | { id: string; name: string | null; email: string }[] | null;
      }[];

      const total = rows.reduce((sum, c) => sum + c.contribution_amount, 0);
      const byUser = new Map<string, { label: string; amount: number }>();
      for (const c of rows) {
        const u = one(c.user);
        if (!u) continue;
        const existing = byUser.get(u.id);
        byUser.set(u.id, { label: u.name || u.email, amount: (existing?.amount ?? 0) + c.contribution_amount });
      }
      const topContributors = Array.from(byUser.values()).sort((a, b) => b.amount - a.amount).slice(0, 5);

      return { quest: q, total, topContributors };
    }),
  );

  const isEmpty = quests.length === 0;

  return (
    <main className="max-w-4xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment text-center mb-2">Tablón de Misiones</h1>
      <p className="font-body text-sm text-parchment-dark text-center mb-10 max-w-xl mx-auto">
        Desafíos del gremio para ganar experiencia y puntos de rango. Un Asistente del Gremio confirma
        cada misión completada — preguntá en tu próxima visita.
      </p>

      {isEmpty && (
        <p className="font-body italic text-center text-parchment-dark py-12">
          No hay misiones activas por el momento. ¡Volvé pronto!
        </p>
      )}

      {community.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl text-parchment mb-3">Misión Comunitaria</h2>
          <div className="flex flex-col gap-4">
            {community.map(({ quest, total, topContributors }) => (
              <div key={quest.id} className="surface-parchment p-5">
                <p className="font-label text-sm font-bold text-ink">{quest.title}</p>
                {quest.narrative && <p className="font-body text-sm text-ink-light mt-1 leading-relaxed">{quest.narrative}</p>}
                <div className="mt-3">
                  <div className="flex items-center justify-between font-label text-2xs uppercase tracking-widest text-leather-light mb-1">
                    <span>Progreso del gremio</span>
                    <span>{total} / {quest.goal_count ?? "—"}</span>
                  </div>
                  <div className="h-2.5 w-full bg-parchment-dark/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-moss transition-all"
                      style={{ width: `${quest.goal_count ? Math.min(100, (total / quest.goal_count) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <p className="font-body text-xs text-brass mt-2">+{quest.reward_rp} RP para todos los que contribuyan</p>
                {topContributors.length > 0 && (
                  <div className="mt-3">
                    <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1">Mayores contribuyentes</p>
                    <ul className="font-body text-xs text-ink-light flex flex-col gap-0.5">
                      {topContributors.map((c, i) => (
                        <li key={i}>{i + 1}. {c.label} — {c.amount}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {individualParty.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl text-parchment mb-3">Misiones Individuales y de Grupo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {individualParty.map((q) => <QuestCard key={q.id} quest={q} />)}
          </div>
        </section>
      )}

      {eventQuests.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-parchment mb-3">Misiones de Evento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {eventQuests.map((q) => {
              const event = one(q.event);
              return (
                <div key={q.id} className="surface-parchment p-5">
                  <p className="font-label text-sm font-bold text-ink">{q.title}</p>
                  {q.narrative && <p className="font-body text-sm text-ink-light mt-1 leading-relaxed">{q.narrative}</p>}
                  <p className="font-body text-xs text-brass mt-2">+{q.reward_xp} XP · +{q.reward_rp} RP</p>
                  {event && (
                    <Link href={`/events/${event.id}`} className="font-body text-xs text-ink-light underline mt-2 inline-block">
                      {event.title} — {formatDateTime(event.starts_at)}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
