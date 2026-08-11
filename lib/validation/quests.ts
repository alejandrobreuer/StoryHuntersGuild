import { z } from "zod";

export const questSchema = z
  .object({
    title:                     z.string().min(1).max(200),
    narrative:                 z.string().max(2000).nullable().optional(),
    type:                      z.enum(["individual", "party", "community", "event"]),
    status:                    z.enum(["draft", "active", "archived"]).default("draft"),
    difficulty:                z.enum(["low", "medium", "high"]).default("medium"),
    reward_xp:                 z.number().int().min(0).max(100000).default(0),
    reward_rp:                 z.number().int().min(0).max(100000).default(0),
    badge_id:                  z.string().uuid().nullable().optional(),
    game_id:                   z.string().uuid().nullable().optional(),
    max_completions_per_event: z.number().int().min(0).max(10000).default(0),
    goal_count:                z.number().int().min(1).max(1000000).nullable().optional(),
    starts_at:                 z.string().nullable().optional(),
    ends_at:                   z.string().nullable().optional(),
  })
  .refine((d) => d.type !== "community" || (d.goal_count ?? 0) > 0, {
    message: "Las misiones comunitarias necesitan una meta de contribuciones.",
    path: ["goal_count"],
  });

export const questCompleteSchema = z.object({
  userId:  z.string().uuid(),
  eventId: z.string().uuid().nullable().optional(),
});

export const questContributeSchema = z.object({
  userId:  z.string().uuid(),
  amount:  z.number().int().min(1).max(1000).default(1),
  eventId: z.string().uuid().nullable().optional(),
});
