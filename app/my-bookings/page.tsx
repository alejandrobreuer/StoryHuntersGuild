import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatARS, formatDateTime } from "@/lib/formatting";
import type { ShgBookingWithEvent } from "@/types/database";

export const metadata = { title: "Mis reservas — Story Hunters Guild" };
export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/sign-in?next=/my-bookings");

  const admin = createAdminClient();
  const { data } = await admin
    .from("shg_bookings")
    .select("*, event:shg_events(id, title, slug, starts_at)")
    .eq("user_id", sessionUser.id)
    .order("created_at", { ascending: false });

  const bookings = (data ?? []) as unknown as ShgBookingWithEvent[];

  return (
    <main className="max-w-2xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment text-center mb-8">Mis reservas</h1>

      {bookings.length === 0 ? (
        <p className="font-body italic text-center text-parchment-dark py-12">
          Todavía no hiciste ninguna reserva.{" "}
          <Link href="/events" className="underline">Ver eventos →</Link>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/events/${b.event.id}`}
              className="surface-parchment p-4 flex items-center justify-between gap-3 no-underline hover:shadow-parchment-lg transition-shadow"
            >
              <div className="min-w-0">
                <p className="font-label text-sm font-bold text-ink truncate">{b.event.title}</p>
                <p className="font-body text-xs text-ink-light italic">{formatDateTime(b.event.starts_at)}</p>
                <p className="font-body text-xs text-leather-light">
                  {b.guest_count} persona{b.guest_count !== 1 ? "s" : ""} — {formatARS(b.cost)}
                </p>
              </div>
              <StatusBadge status={b.status} />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
