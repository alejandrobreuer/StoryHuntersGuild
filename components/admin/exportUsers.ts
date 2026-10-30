import type { UserActivity } from "@/lib/admin/userActivity";
import type { ShgUserPublic, ShgRank } from "@/types/database";
import { currentRank } from "@/lib/gamification/ranks";

const QUEST_TYPE_LABELS: Record<string, string> = {
  individual: "Individual", group: "Grupo", event: "Evento", guild: "Gremio",
};

export const PARTICIPATION_SOURCE_LABELS: Record<string, string> = {
  qr_checkin: "QR de entrada", mission_claim: "Misión (QR)", admin: "Agregada a mano", booking: "Asistencia en Reservas",
};

/** Downloads the given users as an .xlsx with one sheet per kind of data:
 * Usuarios (one row each, with totals), Misiones, Participaciones and
 * Insignias (one row per item, with the user's name and email so each sheet
 * can be filtered on its own). Dates are real dates. xlsx is loaded on demand,
 * same as the Finanzas export. */
export async function exportUsers(users: (ShgUserPublic & { admin_notes?: string | null })[], ranks: ShgRank[], activity: UserActivity, fileName: string) {
  const XLSX = await import("xlsx");
  const byId = new Map(users.map((u) => [u.id, u]));
  const date = (iso: string | null) => (iso ? new Date(iso) : "");
  const who = (userId: string) => {
    const u = byId.get(userId)!;
    return { Usuario: u.name || u.email, Email: u.email };
  };
  const count = (rows: { user_id: string }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
    return m;
  };

  const quests = activity.quests.filter((r) => byId.has(r.user_id));
  const participations = activity.participations.filter((p) => byId.has(p.user_id));
  const badges = activity.badges.filter((b) => byId.has(b.user_id));
  const questCount = count(quests);
  const eventCount = count(participations);
  const badgeCount = count(badges);

  const sheets: { name: string; rows: Record<string, unknown>[]; widths: number[] }[] = [
    {
      name: "Usuarios",
      rows: users.map((u) => ({
        Nombre: u.name ?? "",
        Email: u.email,
        Teléfono: u.phone ?? "",
        XP: u.xp,
        RP: u.rp,
        Rango: currentRank(u.rp, ranks)?.name ?? "",
        Suscriptor: u.is_subscriber ? "Sí" : "No",
        "Suscriptor desde": date(u.subscriber_since),
        Misiones: questCount.get(u.id) ?? 0,
        Eventos: eventCount.get(u.id) ?? 0,
        Insignias: badgeCount.get(u.id) ?? 0,
        Alta: date(u.created_at),
        "Último ingreso": date(u.last_login_at),
        Notas: u.admin_notes ?? "",
      })),
      widths: [24, 30, 16, 8, 8, 16, 11, 16, 9, 9, 10, 11, 14, 40],
    },
    {
      name: "Misiones",
      rows: quests.map((r) => ({
        ...who(r.user_id),
        Misión: r.quest?.title ?? "Misión eliminada",
        Tipo: r.quest ? QUEST_TYPE_LABELS[r.quest.type] ?? r.quest.type : "",
        XP: r.awarded_xp,
        RP: r.awarded_rp,
        Insignia: r.quest?.badge?.name ?? "",
        Fecha: date(r.awarded_at),
      })),
      widths: [24, 30, 34, 12, 8, 8, 20, 11],
    },
    {
      name: "Participaciones",
      rows: participations.map((p) => ({
        ...who(p.user_id),
        Evento: p.event.title,
        "Fecha del evento": date(p.event.starts_at),
        Registro: PARTICIPATION_SOURCE_LABELS[p.source] ?? p.source,
        RP: p.rp,
      })),
      widths: [24, 30, 34, 16, 22, 8],
    },
    {
      name: "Insignias",
      rows: badges.map((b) => ({
        ...who(b.user_id),
        Insignia: b.badge?.name ?? "",
        Fecha: date(b.awarded_at),
      })),
      widths: [24, 30, 26, 11],
    },
  ];

  const workbook = XLSX.utils.book_new();
  for (const s of sheets) {
    const sheet = XLSX.utils.json_to_sheet(s.rows, { dateNF: "dd/mm/yyyy", cellDates: true });
    sheet["!cols"] = s.widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, sheet, s.name);
  }
  XLSX.writeFile(workbook, fileName);
}
