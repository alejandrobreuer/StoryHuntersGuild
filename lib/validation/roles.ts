import { z } from "zod";

export const roleSchema = z.object({
  name:               z.string().min(1).max(60),
  description:        z.string().max(500).nullable().optional(),
  can_access_admin:   z.boolean(),
  perm_events:        z.boolean(),
  perm_venues:        z.boolean(),
  perm_games:         z.boolean(),
  perm_tags:          z.boolean(),
  perm_users:         z.boolean(),
  perm_quests:        z.boolean(),
  perm_turn_ins:      z.boolean(),
  perm_ranks:         z.boolean(),
  perm_badges:        z.boolean(),
  perm_feature_flags: z.boolean(),
  perm_bookings:      z.boolean(),
  perm_reports:       z.boolean(),
  perm_settings:      z.boolean(),
  perm_roles:         z.boolean(),
});
