import { z } from "zod";

export const userAdjustSchema = z.object({
  is_subscriber: z.boolean().optional(),
  adjustXp:      z.number().int().min(-100000).max(100000).optional(),
  adjustRp:      z.number().int().min(-100000).max(100000).optional(),
  resetPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(100).optional(),
});
