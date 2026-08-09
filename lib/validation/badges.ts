import { z } from "zod";

export const badgeSchema = z.object({
  name:        z.string().min(1).max(80),
  description: z.string().max(500).nullable().optional(),
  icon:        z.string().max(10).nullable().optional(),
});
