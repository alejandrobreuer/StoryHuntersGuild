import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/guard";
import { BookingForm } from "@/components/booking/BookingForm";
import { formatDateTime } from "@/lib/formatting";

export const metadata = { title: "Reservar — Story Hunters Guild" };
export const dynamic = "force-dynamic";

export default async function BookEventPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("shg_events")
    .select("id, title, starts_at, price_per_person, status")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();

  if (!event) notFound();

  const [{ data: remainingRow }, { data: setting }, sessionUser] = await Promise.all([
    admin.from("shg_event_remaining").select("remaining").eq("event_id", params.id).maybeSingle(),
    admin.from("shg_settings").select("value").eq("key", "bank_transfer_instructions").maybeSingle(),
    getSessionUser(),
  ]);

  const remaining = remainingRow?.remaining ?? 0;

  let defaultName = "", defaultEmail = "", defaultPhone = "";
  if (sessionUser) {
    const { data: profile } = await admin.from("shg_users").select("name, email, phone").eq("id", sessionUser.id).maybeSingle();
    defaultName  = profile?.name ?? "";
    defaultEmail = profile?.email ?? sessionUser.email;
    defaultPhone = profile?.phone ?? "";
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-14">
      <Link href={`/events/${event.id}`} className="inline-flex items-center gap-1.5 text-xs font-label uppercase tracking-widest text-parchment-dark mb-6 no-underline">
        <ArrowLeft size={14} /> Volver al evento
      </Link>

      <h1 className="font-display text-2xl text-parchment mb-1">{event.title}</h1>
      <p className="font-body italic text-parchment-dark/70 mb-8">{formatDateTime(event.starts_at)}</p>

      {remaining <= 0 ? (
        <p className="surface-parchment p-6 text-center font-body text-ink-light">
          Este evento ya no tiene cupo disponible.
        </p>
      ) : (
        <BookingForm
          eventId={event.id}
          pricePerPerson={Number(event.price_per_person)}
          remaining={remaining}
          bankInstructions={setting?.value ?? ""}
          defaultName={defaultName}
          defaultEmail={defaultEmail}
          defaultPhone={defaultPhone}
        />
      )}
    </main>
  );
}
