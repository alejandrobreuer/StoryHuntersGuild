import { z } from "zod";

export const questSchema = z
  .object({
    title:                     z.string().min(1).max(200),
    narrative:                 z.string().max(2000).nullable().optional(),
    type:                      z.enum(["individual", "group", "event", "guild"]),
    status:                    z.enum(["draft", "active", "archived"]).default("draft"),
    difficulty:                z.enum(["low", "medium", "high"]).default("medium"),
    reward_xp:                 z.number().int().min(0).max(100000).default(0),
    reward_rp:                 z.number().int().min(0).max(100000).default(0),
    badge_id:                  z.string().uuid().nullable().optional(),
    game_id:                   z.string().uuid().nullable().optional(),
    max_completions_per_event: z.number().int().min(0).max(10000).default(0),
    max_participants:          z.number().int().min(2).max(100).nullable().optional(),
    required_turn_ins:         z.number().int().min(1).max(1000000).nullable().optional(),
    goal_count:                z.number().int().min(1).max(1000000).nullable().optional(),
    starts_at:                 z.string().nullable().optional(),
    ends_at:                   z.string().nullable().optional(),
  })
  .refine((d) => d.type !== "group" || (d.max_participants ?? 0) >= 2, {
    message: "Las misiones de grupo necesitan un tamaño máximo de al menos 2.",
    path: ["max_participants"],
  })
  .refine((d) => d.type !== "event" || (d.required_turn_ins ?? 0) > 0, {
    message: "Las misiones de evento necesitan la cantidad de entregas requeridas.",
    path: ["required_turn_ins"],
  })
  .refine((d) => d.type !== "guild" || (d.goal_count ?? 0) > 0, {
    message: "Las misiones de gremio necesitan una meta de contribuciones.",
    path: ["goal_count"],
  })
  .refine((d) => d.type !== "guild" || Boolean(d.starts_at && d.ends_at), {
    message: "Las misiones de gremio necesitan fecha de inicio y fin.",
    path: ["ends_at"],
  });

export const questCompleteSchema = z.object({
  userId:  z.string().uuid(),
  eventId: z.string().uuid().nullable().optional(),
});

export const questRejectSchema = z.object({
  userId:  z.string().uuid(),
  eventId: z.string().uuid().nullable().optional(),
});

export const questActivationSchema = z.object({
  eventId: z.string().uuid(),
});

export const questGroupJoinSchema = z.object({
  eventId: z.string().uuid(),
  groupId: z.string().uuid().nullable().optional(),
});

export const questGroupActionSchema = z.object({
  groupId: z.string().uuid(),
});
