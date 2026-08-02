import { createAdminClient } from "@/lib/supabase/admin";

/** Live remaining-capacity lookup for a single event, via shg_event_remaining. */
export async function getEventRemaining(eventId: string): Promise<number | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shg_event_remaining")
    .select("remaining")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error || !data) return null;
  return data.remaining;
}
