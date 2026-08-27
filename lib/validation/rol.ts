import { z } from "zod";

// ─── Fabula Ultima character sheet ───────────────────────────────────────────
// Mirrors app/FU/lib/types.ts's FUCharacter exactly (minus id/createdAt/
// updatedAt, which are the shg_rol_character row's own id/created_at/
// updated_at) — this is the runtime validator for the sheet_data jsonb blob,
// which app/FU itself never had (it only had structural TS types).

const dieSizeSchema = z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]);

const bondEmotionSchema = z.enum(["admiration", "inferiority", "loyalty", "mistrust", "affection", "hatred"]);

const affinityStatusSchema = z.enum(["normal", "resistant", "vulnerable", "immune", "absorb"]);

const attributesSchema = z.object({
  dexterity: dieSizeSchema,
  insight:   dieSizeSchema,
  might:     dieSizeSchema,
  willpower: dieSizeSchema,
});

// Per-class level cap of 10 mirrors the rulebook's own class-level cap
// (before Mastery, out of scope here) — see MAX_CLASS_LEVEL in derivedStats.ts.
const classLevelSchema = z.object({
  classId:     z.string().min(1),
  levels:      z.number().int().min(1).max(10),
  skillsTaken: z.array(z.string()),
});

const equipmentSchema = z.object({
  weapons: z.array(z.string()).max(2),
  shield:  z.string().optional(),
  armor:   z.string().optional(),
});

const bondSchema = z.object({
  name:     z.string().min(1),
  emotions: z.array(bondEmotionSchema).max(3),
});

export const fuCharacterSheetSchema = z.object({
  // 3 classes × MAX_CLASS_LEVEL(10) is the highest a character can reach in this model.
  level: z.number().int().min(1).max(30),

  identity: z.string(),
  theme:    z.string(),
  origin:   z.string(),
  trait:    z.string().max(500).default(""),
  quirks:   z.string().max(1000).default(""),

  classLevels:   z.array(classLevelSchema).min(1).max(3),
  attributes:    attributesSchema,
  statusEffects: z.array(z.string()),
  bonds:         z.array(bondSchema).max(6),

  equipment: equipmentSchema,
  backpack:  z.array(z.string()).max(50).default([]),
  zenit:     z.number().int().min(0),

  name:       z.string().min(1),
  pronouns:   z.string(),
  appearance: z.string(),

  fabulaPoints: z.number().int().min(0),

  currentHp: z.number().int().min(0).default(0),
  currentMp: z.number().int().min(0).default(0),
  currentIp: z.number().int().min(0).default(0),

  xp: z.number().int().min(0).default(0),

  elementalAffinities: z.record(z.string(), affinityStatusSchema).default({}),
});

export type RolCharacterSheet = z.infer<typeof fuCharacterSheetSchema>;

export const characterSchema = z.object({
  name:           z.string().min(1).max(200),
  sheet_data:     fuCharacterSheetSchema,
  portrait_url:   z.string().url().nullable().optional().or(z.literal("")),
  full_body_url:  z.string().url().nullable().optional().or(z.literal("")),
});

// ─── Guild config ─────────────────────────────────────────────────────────────

export const guildSchema = z.object({
  name:                     z.string().min(1).max(200),
  image_url:                z.string().url().nullable().optional().or(z.literal("")),
  description:              z.string().max(4000).nullable().optional().or(z.literal("")),
  supplies:                 z.number().int().min(0).max(1000000).default(0),
  current_guild_status_id:  z.string().uuid().nullable().optional(),
});

export const guildFeatureSchema = z.object({
  title:            z.string().min(1).max(200),
  description:      z.string().min(1).max(2000),
  benefit:          z.string().max(500).nullable().optional().or(z.literal("")),
  unlocked:         z.boolean().default(false),
  sort_order:       z.number().int().default(0),
  guild_status_id:  z.string().uuid().nullable().optional(),
  cost_supplies:    z.number().int().min(0).max(1000000).default(0),
});

export const guildRankSchema = z.object({
  name:             z.string().min(1).max(100),
  points_threshold: z.number().int().min(0),
  sort_order:       z.number().int().default(0),
});

export const guildStatusSchema = z.object({
  name:       z.string().min(1).max(100),
  sort_order: z.number().int().default(0),
});

// ─── Map / locations ────────────────────────────────────────────────────────

export const locationSchema = z.object({
  name:                z.string().min(1).max(200),
  type:                z.string().min(1).max(100),
  description:         z.string().min(1).max(2000),
  x_pct:               z.number().min(0).max(100),
  y_pct:               z.number().min(0).max(100),
  discovered:          z.boolean().default(false),
  icon_url:            z.string().url().nullable().optional().or(z.literal("")),
  icon_source_url:     z.string().url().nullable().optional().or(z.literal("")),
  icon_outline_color:  z.enum(["black", "red", "white"]).default("black"),
});

// ─── Quests ─────────────────────────────────────────────────────────────────

export const questSchema = z.object({
  title:             z.string().min(1).max(200),
  description:       z.string().min(1).max(2000),
  location_id:       z.string().uuid().nullable().optional(),
  reward_coin:       z.number().int().min(0).max(1000000).default(0),
  reward_standing:   z.number().int().min(0).max(1000000).default(0),
  reward_supplies:   z.number().int().min(0).max(1000000).default(0),
  max_participants:  z.number().int().min(1).max(20).default(4),
  scheduled_date:    z.string().nullable().optional().or(z.literal("")),
  session_count:     z.number().int().min(1).max(50).default(1),
});

// A player applies with exactly one of their own characters — ownership is
// verified server-side in app/api/rol/quests/[id]/apply/route.ts, never
// trusted from the client.
export const questApplySchema = z.object({
  character_id: z.string().uuid(),
});

export const questApplicationDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const questLeaderVoteSchema = z.object({
  candidate_character_id: z.string().uuid(),
});

export const questLeaderSetSchema = z.object({
  character_id: z.string().uuid(),
});

export const questSupplyAllocateSchema = z.object({
  feature_id: z.string().uuid(),
  amount:     z.number().int().min(1),
});

export const questFinishSchema = z.object({
  history_summary: z.string().max(4000).nullable().optional().or(z.literal("")),
});

export const questNoteCreateSchema = z.object({
  content:      z.string().min(1).max(5000),
  visibility:   z.enum(["public", "dm_private", "player_private"]),
  character_id: z.string().uuid().nullable().optional(),
}).refine((d) => d.visibility !== "player_private" || Boolean(d.character_id), {
  message: "Las notas privadas de jugador necesitan un personaje.",
  path: ["character_id"],
});

export const playerQuestNoteCreateSchema = z.object({
  content: z.string().min(1).max(5000),
});

// ─── NPCs & factions ────────────────────────────────────────────────────────

export const factionSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional().or(z.literal("")),
  sort_order:  z.number().int().default(0),
});

export const npcFactionLinkSchema = z.object({
  faction_id: z.string().uuid(),
  is_former:  z.boolean().default(false),
});

// Predefined role tags (merchant, militia, ...) — a separate catalog from
// factions, enforced the same way shg_tags/shg_games.tags is (see
// 009_shg_tags.sql / 024_shg_rol_npc_tags.sql): the array here is just
// names, but the DB rejects any name not present in shg_rol_npc_tag.
export const npcTagSchema = z.object({
  name: z.string().min(1).max(100),
});

export const npcSchema = z.object({
  name:                  z.string().min(1).max(200),
  description:           z.string().min(1).max(2000),
  residence_location_id: z.string().uuid().nullable().optional(),
  origin_location_id:    z.string().uuid().nullable().optional(),
  standing:              z.enum(["hostile", "unfriendly", "neutral", "friendly", "allied"]).default("neutral"),
  portrait_url:          z.string().url().nullable().optional().or(z.literal("")),
  full_body_url:         z.string().url().nullable().optional().or(z.literal("")),
  factions:              z.array(npcFactionLinkSchema).max(20).default([]),
  tags:                  z.array(z.string().min(1).max(100)).max(20).default([]),
  hidden:                z.boolean().default(false),
});
