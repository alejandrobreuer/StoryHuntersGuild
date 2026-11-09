import { createAdminClient } from "@/lib/supabase/admin";
import { LOW_AVAILABILITY_SETTING_KEY, parseLowAvailabilityThreshold } from "@/lib/availability";

/** Server-side read of the threshold (remaining spots at or below it show "Disponibilidad baja"). */
export async function getLowAvailabilityThreshold(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shg_settings")
    .select("value")
    .eq("key", LOW_AVAILABILITY_SETTING_KEY)
    .maybeSingle();
  return parseLowAvailabilityThreshold(data?.value);
}
