import { z } from "zod";

export const venueSchema = z.object({
  name:    z.string().min(2).max(200),
  address: z.string().min(2).max(300),
  city:    z.string().max(100).nullable().optional(),
  map_url: z.string().url().nullable().optional().or(z.literal("")),
  notes:   z.string().max(2000).nullable().optional(),
});
