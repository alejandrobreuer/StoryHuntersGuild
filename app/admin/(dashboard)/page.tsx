import { ClipboardList, CalendarCheck, Users, Dice5 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getStats() {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [pendingReceipts, upcomingEvents, approvedBookings, librarySize] = await Promise.all([
    admin.from("shg_bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("shg_events").select("id", { count: "exact", head: true }).eq("status", "published").gte("starts_at", now),
    admin.from("shg_bookings").select("guest_count").eq("status", "approved"),
    admin.from("shg_games").select("id", { count: "exact", head: true }),
  ]);

  return {
    pendingReceipts: pendingReceipts.count ?? 0,
    upcomingEvents:  upcomingEvents.count ?? 0,
    confirmedSpots:  (approvedBookings.data ?? []).reduce((s, b) => s + b.guest_count, 0),
    librarySize:     librarySize.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const tiles = [
    { label: "Comprobantes pendientes", value: stats.pendingReceipts, icon: ClipboardList, accent: "text-brass" },
    { label: "Eventos próximos",        value: stats.upcomingEvents,  icon: CalendarCheck, accent: "text-moss-light" },
    { label: "Lugares confirmados",     value: stats.confirmedSpots,  icon: Users,          accent: "text-crimson" },
    { label: "Juegos en la ludoteca",   value: stats.librarySize,     icon: Dice5,          accent: "text-brass-light" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl text-parchment mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="surface-parchment p-5">
            <Icon size={22} className={accent} />
            <p className="font-display text-3xl font-semibold text-ink mt-3">{value}</p>
            <p className="font-label text-2xs uppercase tracking-widest text-leather-light mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
