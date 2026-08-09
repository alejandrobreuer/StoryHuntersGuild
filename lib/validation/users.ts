import { z } from "zod";

export const userAdjustSchema = z.object({
  is_subscriber: z.boolean().optional(),
  adjustXp:      z.number().int().min(-100000).max(100000).optional(),
  adjustRp:      z.number().int().min(-100000).max(100000).optional(),
});
