import { z } from "zod";

export const gameSchema = z.object({
  name:              z.string().min(1).max(200),
  min_players:       z.number().int().min(1).max(99),
  max_players:       z.number().int().min(1).max(99),
  playtime_minutes:  z.number().int().min(1).max(1440),
  complexity:        z.enum(["light", "medium", "heavy"]),
  beginner_friendly: z.boolean().default(false),
  tags:              z.array(z.string().max(40)).max(20).default([]),
  image_url:         z.string().url().nullable().optional().or(z.literal("")),
  description:       z.string().max(2000).nullable().optional(),
  bgg_link:          z.string().url().nullable().optional().or(z.literal("")),
  rules:             z.string().max(10000).nullable().optional(),
  available:         z.boolean().default(true),
}).refine((d) => d.max_players >= d.min_players, {
  message: "El máximo de jugadores debe ser mayor o igual al mínimo.",
  path: ["max_players"],
});
