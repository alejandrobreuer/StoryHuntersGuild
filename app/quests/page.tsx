import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Check, X, ScrollText } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/guard";
import { getFeatureFlags } from "@/lib/features";
import { formatDateTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { QuestType, QuestHistoryOutcome } from "@/types/database";

export const metadata = { title: "Historial — Story Hunters Guild" };
export const dynamic = "force-dynamic";

interface HistoryRow {
  id: string;
  quest_title: string;
  quest_type: string;
  event_title: string | null;
  outcome: QuestHistoryOutcome;
  other_participants: string[] | null;
  awarded_xp: number;
  awarded_rp: number;
  recorded_at: string;
}

const TYPE_LABELS: Record<QuestType, string> = {
  individual: "Individual", group: "Grupo", event: "Evento", guild: "Misión de Gremio",
};

export default async function HistorialPage() {
  noStore();
  const features = await getFeatureFlags();
  if (!features.quests) redirect("/");

  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/sign-in?next=/quests");

  const admin = createAdminClient();
  const { data } = await admin
    .from("shg_quest_history")
    .select("id, quest_title, quest_type, event_title, outcome, other_participants, awarded_xp, awarded_rp, recorded_at")
    .eq("user_id", sessionUser.id)
    .order("recorded_at", { ascending: false });

  const rows = (data ?? []) as HistoryRow[];

  return (
    <main className="max-w-3xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment text-center mb-2">Historial</h1>
      <p className="font-body text-sm text-parchment-dark text-center mb-10 max-w-xl mx-auto">
        Cada misión que completaste o no lograste, con fecha, evento y recompensa — tu registro
        personal del gremio.
      </p>

      {rows.length === 0 ? (
        <div className="text-center py-16">
          <ScrollText size={28} className="mx-auto text-parchment-dark/60 mb-3" />
          <p className="font-body italic text-parchment-dark">Todavía no tenés misiones en tu historial.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.id} className="surface-parchment p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-label text-sm font-bold text-ink">{r.quest_title}</p>
                  <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">
                    {TYPE_LABELS[r.quest_type as QuestType] ?? r.quest_type}
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm",
                    r.outcome === "completed" ? "bg-moss/15 text-moss-dark" : "bg-crimson/15 text-crimson"
                  )}>
                    {r.outcome === "completed" ? <Check size={11} /> : <X size={11} />}
                    {r.outcome === "completed" ? "Completada" : "Fallida"}
                  </span>
                </div>
                <p className="font-body text-xs text-ink-light">
                  {r.event_title ? `${r.event_title} · ` : ""}{formatDateTime(r.recorded_at)}
                  {r.other_participants && r.other_participants.length > 0 && ` · con ${r.other_participants.join(", ")}`}
                </p>
              </div>
              {r.outcome === "completed" && (r.awarded_xp > 0 || r.awarded_rp > 0) && (
                <p className="font-label text-2xs text-brass shrink-0">
                  +{r.awarded_xp} XP · +{r.awarded_rp} RP
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
