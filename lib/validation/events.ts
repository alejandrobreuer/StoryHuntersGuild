import { z } from "zod";

export const eventSchema = z.object({
  title:             z.string().min(2).max(200),
  description:       z.string().max(3000).nullable().optional(),
  venue_id:          z.string().uuid("Elegí un lugar."),
  starts_at:         z.string().datetime({ offset: true }).or(z.string().min(1)),
  ends_at:           z.string().datetime({ offset: true }).or(z.string()).nullable().optional(),
  capacity:          z.number().int().min(1).max(1000),
  price_per_person:  z.number().min(0),
  status:            z.enum(["draft", "published", "cancelled"]).default("draft"),
  cover_image_url:   z.string().url().nullable().optional().or(z.literal("")),
  game_ids:          z.array(z.string().uuid()).max(50).default([]),
});
