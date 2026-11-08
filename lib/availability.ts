/** shg_settings key holding the "Disponibilidad baja" threshold. Client-safe (no DB imports). */
export const LOW_AVAILABILITY_SETTING_KEY = "low_availability_threshold";
export const LOW_AVAILABILITY_DEFAULT = 10;

/** Parses the stored setting value; falls back to the default on anything invalid. */
export function parseLowAvailabilityThreshold(value: string | null | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : LOW_AVAILABILITY_DEFAULT;
}
