import { z } from "zod";

export const rankSchema = z.object({
  name:        z.string().min(1).max(60),
  rp_required: z.number().int().min(0).max(100000),
  benefit:     z.string().max(500).nullable().optional(),
  icon_url:    z.string().url().nullable().optional().or(z.literal("")),
});
