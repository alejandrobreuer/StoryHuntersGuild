import { z } from "zod";

export const userAdjustSchema = z.object({
  is_subscriber: z.boolean().optional(),
  adjustXp:      z.number().int().min(-100000).max(100000).optional(),
  adjustRp:      z.number().int().min(-100000).max(100000).optional(),
  resetPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(100).optional(),
});

export const userQuestGrantSchema = z.object({
  questId: z.string().uuid(),
  eventId: z.string().uuid().nullable().optional(),
});

export const userEventGrantSchema = z.object({
  eventId: z.string().uuid(),
});

export const userMergeSchema = z.object({
  keepId: z.string().uuid(),
  dropId: z.string().uuid(),
}).refine((d) => d.keepId !== d.dropId, { message: "Elegí dos cuentas distintas." });
