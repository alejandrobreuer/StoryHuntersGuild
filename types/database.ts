// =============================================================================
// Story Hunters Guild — Database Types
// Mirrors supabase/migrations/001_shg_init.sql exactly. Keep in sync.
// =============================================================================

export type EventStatus    = "draft" | "published" | "cancelled";
export type BookingStatus  = "pending" | "approved" | "rejected" | "cancelled";
export type GameComplexity = "light" | "medium" | "heavy";
export type EventType      = "cooperative" | "competitive" | "tournament" | "release" | "guilds_choice";
export type QuestType      = "individual" | "group" | "event" | "guild";
export type QuestStatus    = "draft" | "active" | "archived";
export type QuestDifficulty = "low" | "medium" | "high";
export type FeatureFlagKey = "progression" | "quests" | "ranks" | "subscriptions" | "event_rewards";

// ─── Identity ───────────────────────────────────────────────────────────────

export interface ShgUser {
  id:                    string;
  email:                 string;
  name:                  string | null;
  phone:                 string | null;
  /** "saltHex:hashHex" from lib/auth/password.ts, or null for magic-link-only accounts. */
  password_hash:         string | null;
  failed_login_attempts: number;
  locked_until:          string | null;
  xp:                    number;
  rp:                    number;
  is_subscriber:         boolean;
  subscriber_since:      string | null;
  created_at:            string;
  last_login_at:         string | null;
}

/** ShgUser fields safe to ever send to a client — never password_hash or the lockout counters. */
export type ShgUserPublic = Omit<ShgUser, "password_hash" | "failed_login_attempts" | "locked_until">;

export interface ShgAdminUser {
  id:                    string;
  email:                 string;
  name:                  string;
  role_id:               string;
  password_hash:         string | null;
  failed_login_attempts: number;
  locked_until:          string | null;
  is_active:             boolean;
  created_at:            string;
  last_login_at:         string | null;
}

// One flag per admin-panel section, plus the master "can enter the panel
// at all" switch. Keep in sync with shg_security_roles' perm_* columns.
export type PermissionKey =
  | "events" | "venues" | "games" | "tags" | "users" | "quests"
  | "ranks" | "badges" | "feature_flags" | "bookings" | "reports"
  | "settings" | "roles" | "turn_ins" | "rol";

export interface ShgSecurityRole {
  id:                 string;
  name:               string;
  description:        string | null;
  can_access_admin:   boolean;
  perm_events:        boolean;
  perm_venues:        boolean;
  perm_games:         boolean;
  perm_tags:          boolean;
  perm_users:         boolean;
  perm_quests:        boolean;
  perm_ranks:         boolean;
  perm_badges:        boolean;
  perm_feature_flags: boolean;
  perm_bookings:      boolean;
  perm_reports:       boolean;
  perm_settings:      boolean;
  perm_roles:         boolean;
  perm_turn_ins:      boolean;
  perm_rol:           boolean;
  created_at:         string;
  updated_at:         string;
}

// ─── Catalog ────────────────────────────────────────────────────────────────

export interface ShgVenue {
  id:             string;
  name:           string;
  address:        string;
  city:           string | null;
  map_url:        string | null;
  instagram_url:  string | null;
  logo_url:       string | null;
  notes:          string | null;   // admin-only, never sent to public API responses
  created_at:     string;
  updated_at:     string;
}

/** Venue fields safe to include in a public API response — no `notes`. */
export type ShgVenuePublic = Omit<ShgVenue, "notes">;

export interface ShgTag {
  id:         string;
  name:       string;
  created_at: string;
  updated_at: string;
}

export interface ShgGame {
  id:                string;
  name:              string;
  slug:              string;
  min_players:       number;
  max_players:       number;
  playtime_minutes:  number;
  complexity:        GameComplexity;
  beginner_friendly: boolean;
  tags:              string[];
  image_url:         string | null;
  description:       string | null;
  bgg_link:          string | null;
  rules:             string | null;
  available:         boolean;
  created_at:        string;
  updated_at:        string;
}

export interface ShgEvent {
  id:                string;
  title:             string;
  slug:              string;
  description:       string | null;
  venue_id:          string;
  starts_at:         string;
  ends_at:           string | null;
  /** Actual Start/End clicked by an admin — distinct from the scheduled starts_at/ends_at above. */
  started_at:        string | null;
  ended_at:          string | null;
  capacity:          number;
  price_per_person:  number;
  currency:          string;
  status:            EventStatus;
  cover_image_url:   string | null;
  event_type:        EventType | null;
  reward_rp:         number;
  created_at:        string;
  updated_at:        string;
}

export interface ShgEventWithVenue extends ShgEvent {
  venue:     ShgVenuePublic;
  games:     ShgGame[];
  remaining: number;
}

export interface ShgEventListItem extends ShgEvent {
  venue:     Pick<ShgVenuePublic, "id" | "name" | "city">;
  remaining: number;
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export interface ShgBooking {
  id:            string;
  event_id:      string;
  user_id:       string | null;
  name:          string;
  email:         string;
  phone:         string | null;
  guest_count:   number;
  cost:          number;
  status:        BookingStatus;
  attended:      boolean;
  rp_awarded:    number;
  receipt_path:  string | null;
  admin_note:    string | null;
  reviewed_by:   string | null;
  reviewed_at:   string | null;
  created_at:    string;
  updated_at:    string;
}

export interface ShgBookingWithEvent extends ShgBooking {
  event: Pick<ShgEvent, "id" | "title" | "slug" | "starts_at">;
}

// ─── Gamification: feature flags, progression, ranks, badges, quests ────────

export interface ShgFeatureFlag {
  key:         FeatureFlagKey;
  label:       string;
  description: string | null;
  enabled:     boolean;
  updated_at:  string;
}

export interface ShgRank {
  id:          string;
  name:        string;
  rp_required: number;
  benefit:     string | null;
  icon_url:    string | null;
  created_at:  string;
  updated_at:  string;
}

export interface ShgBadge {
  id:          string;
  name:        string;
  description: string | null;
  icon:        string | null;
  icon_url:    string | null;
  created_at:  string;
}

export interface ShgUserBadge {
  user_id:    string;
  badge_id:   string;
  awarded_at: string;
}

export interface ShgQuest {
  id:                         string;
  title:                      string;
  narrative:                  string | null;
  type:                       QuestType;
  status:                     QuestStatus;
  difficulty:                 QuestDifficulty;
  reward_xp:                  number;
  reward_rp:                  number;
  badge_id:                   string | null;
  game_id:                    string | null;
  max_completions_per_event:  number;
  /** Group missions: max members per party instance. */
  max_participants:           number | null;
  /** Event missions: turn-ins needed to achieve & close the mission. */
  required_turn_ins:          number | null;
  /** Guild missions: target total approved turn-ins for the shared progress bar. */
  goal_count:                 number | null;
  starts_at:                  string | null;
  ends_at:                    string | null;
  created_at:                 string;
  updated_at:                 string;
}

export type QuestEventStatus = "open" | "achieved" | "failed";

export interface ShgQuestEvent {
  quest_id:  string;
  event_id:  string;
  status:    QuestEventStatus;
  closed_at: string | null;
}

export type QuestActivationStatus = "active" | "turned_in" | "rejected" | "confirmed";

export interface ShgQuestActivation {
  id:           string;
  quest_id:     string;
  /** Null for Guild missions — they aren't tied to any event. */
  event_id:     string | null;
  user_id:      string;
  status:       QuestActivationStatus;
  activated_at: string;
  turned_in_at: string | null;
}

export interface ShgQuestCompletion {
  id:                  string;
  quest_id:            string;
  user_id:             string;
  contribution_amount: number;
  event_id:            string | null;
  logged_by:           string | null;
  created_at:          string;
}

export interface ShgQuestReward {
  id:            string;
  quest_id:      string;
  user_id:       string;
  completion_id: string | null;
  group_id:      string | null;
  awarded_xp:    number;
  awarded_rp:    number;
  awarded_by:    string | null;
  awarded_at:    string;
}

export type QuestGroupStatus = "forming" | "started" | "turned_in" | "completed" | "rejected";

export interface ShgQuestGroup {
  id:           string;
  quest_id:     string;
  event_id:     string;
  status:       QuestGroupStatus;
  started_at:   string | null;
  turned_in_at: string | null;
  turned_in_by: string | null;
  closed_at:    string | null;
  closed_by:    string | null;
  created_at:   string;
}

export interface ShgQuestGroupMember {
  group_id:  string;
  user_id:   string;
  joined_at: string;
}

export type QuestHistoryOutcome = "completed" | "failed";

export interface ShgQuestHistory {
  id:                 string;
  quest_id:           string | null;
  quest_title:        string;
  quest_type:         string;
  event_id:           string | null;
  event_title:        string | null;
  user_id:            string | null;
  user_label:         string;
  outcome:            QuestHistoryOutcome;
  group_id:           string | null;
  other_participants: string[] | null;
  awarded_xp:         number;
  awarded_rp:         number;
  recorded_at:        string;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface ShgSetting {
  key:        string;
  value:      string;
  updated_at: string;
}

// ─── Rol (Adventurers Guild) ────────────────────────────────────────────────
// A single shared Fabula Ultima world — one shg_rol_guild row, one DM
// (an shg_admin_user with perm_rol), many players (shg_users). Distinct from
// the unrelated ShgQuest/ShgRank gamification system above.

export type RolQuestStatus   = "available" | "active" | "completed";
export type RolNoteVisibility = "public" | "dm_private" | "player_private";

export interface ShgRolGuild {
  id:                       string;
  name:                     string;
  image_url:                string | null;
  description:              string | null;
  supplies:                 number;
  /** GM-advanced tier — see ShgRolGuildStatus. Not computed from any number. */
  current_guild_status_id:  string | null;
  created_at:               string;
  updated_at:               string;
}

export interface ShgRolGuildFeature {
  id:                  string;
  guild_id:            string;
  title:               string;
  description:         string;
  benefit:             string | null;
  unlocked:            boolean;
  sort_order:          number;
  /** Minimum Guild Status tier required for this feature to be eligible for supply allocation. */
  guild_status_id:     string | null;
  cost_supplies:       number;
  supplies_allocated:  number;
  created_at:          string;
}

export interface ShgRolGuildRank {
  id:               string;
  guild_id:         string;
  name:             string;
  points_threshold: number;
  sort_order:        number;
}

export interface ShgRolGuildStatus {
  id:         string;
  guild_id:   string;
  name:       string;
  sort_order: number;
  created_at: string;
}

export interface ShgRolCharacter {
  id:             string;
  owner_id:       string;
  name:           string;
  /** Full Fabula Ultima sheet — flexible shape, validated with
   *  lib/validation/rol.ts's fuCharacterSheetSchema, not typed rigidly here. */
  sheet_data:     Record<string, unknown>;
  guild_rank_id:  string | null;
  guild_points:   number;
  created_at:     string;
  updated_at:     string;
}

export interface ShgRolMap {
  id:        string;
  guild_id:  string;
  image_url: string | null;
}

export type RolIconOutlineColor = "black" | "red" | "white";

export interface ShgRolLocation {
  id:                 string;
  map_id:             string;
  name:               string;
  type:               string;
  description:        string;
  x_pct:              number;
  y_pct:              number;
  discovered:         boolean;
  /** Outlined variant baked by lib/rol/iconOutline.ts — what markers actually render. */
  icon_url:           string | null;
  /** Pristine pre-outline upload, kept so the outline can be regenerated without re-uploading art. */
  icon_source_url:    string | null;
  icon_outline_color: RolIconOutlineColor;
  created_at:         string;
}

export interface ShgRolQuest {
  id:                 string;
  location_id:        string | null;
  title:              string;
  description:        string;
  status:             RolQuestStatus;
  reward_coin:        number;
  reward_standing:    number;
  reward_supplies:    number;
  max_participants:   number;
  /** Calendar date the mission is meant to run — a plain date, no time. */
  scheduled_date:     string | null;
  session_count:      number;
  created_at:         string;
  completed_at:       string | null;
  completed_by:       string | null;
}

export interface ShgRolQuestParticipant {
  quest_id:     string;
  character_id: string;
}

export type RolQuestApplicationStatus = "pending" | "approved" | "rejected";

export interface ShgRolQuestApplication {
  id:            string;
  quest_id:      string;
  character_id:  string;
  status:        RolQuestApplicationStatus;
  applied_at:    string;
  decided_at:    string | null;
  decided_by:    string | null;
}

export interface ShgRolQuestNote {
  id:           string;
  quest_id:     string;
  visibility:   RolNoteVisibility;
  character_id: string | null;
  author_id:    string;
  author_kind:  "player" | "admin";
  content:      string;
  created_at:   string;
}

// ─── NPCs & factions ────────────────────────────────────────────────────────

export type RolNpcStanding = "hostile" | "unfriendly" | "neutral" | "friendly" | "allied";

export interface ShgRolFaction {
  id:          string;
  name:        string;
  description: string | null;
  sort_order:  number;
  created_at:  string;
}

export interface ShgRolNpc {
  id:                     string;
  name:                   string;
  description:            string;
  /** Where they live now. */
  residence_location_id:  string | null;
  /** Where they're from — distinct from residence. */
  origin_location_id:     string | null;
  standing:               RolNpcStanding;
  portrait_url:           string | null;
  full_body_url:          string | null;
  /** Descriptive role tags (merchant, militia, ...) — independent of faction. */
  tags:                   string[];
  /** GM-only: hidden NPCs never appear in a player-facing response. */
  hidden:                 boolean;
  created_at:             string;
  updated_at:             string;
}

export interface ShgRolNpcTag {
  id:         string;
  name:       string;
  created_at: string;
  updated_at: string;
}

export interface ShgRolNpcFaction {
  npc_id:     string;
  faction_id: string;
  /** True when the NPC used to belong to this faction but no longer does — shown as "Ex-<faction>". */
  is_former:  boolean;
}

// ─── Session payloads (signed into the shg_session / shg_admin_session cookies) ──

export interface ShgSessionPayload {
  sub:   string;   // shg_users.id
  email: string;
  kind:  "public";
}

export interface ShgAdminSessionPayload {
  sub:   string;   // shg_admin_users.id
  email: string;
  kind:  "admin";
}
