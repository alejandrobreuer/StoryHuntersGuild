import { z } from "zod";

/** PATCH body for a mission code or the event check-in code: toggle it, or rotate its token. */
export const qrCodeUpdateSchema = z.union([
  z.object({ active: z.boolean() }),
  z.object({ regenerate: z.literal(true) }),
]);

export const qrSettingsSchema = z.object({
  claimsOpenBefore:  z.number().int().min(0, "No puede ser negativo.").max(24 * 60, "Máximo 24 horas."),
  claimsCloseAfter:  z.number().int().min(0, "No puede ser negativo.").max(24 * 60, "Máximo 24 horas."),
  checkinOpenBefore: z.number().int().min(0, "No puede ser negativo.").max(24 * 60, "Máximo 24 horas."),
});
