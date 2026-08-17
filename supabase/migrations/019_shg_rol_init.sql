-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol (Adventurers Guild) section
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 018_shg_admin_restructure.sql.
--
-- A single shared Fabula Ultima world: one Guild, one DM, many players.
-- Prefixed shg_rol_ (on top of the app-wide shg_ boundary) to stay distinct
-- from the unrelated existing shg_quest/ShgRank gamification system (XP/RP,
-- event-tied missions) — same word, different subsystem.
--
-- This app has no Supabase Auth (see 001_shg_init.sql) — there is no
-- auth.uid() to hang per-row RLS off of. Every table below gets RLS ENABLED
-- but ZERO policies, identical to shg_venues/shg_bookings/shg_users: all
-- reads and writes go through Next.js API routes using the shg_service role
-- (bypasses RLS by GRANT — see 002_shg_scoped_role.sql — not by policy).
-- Players = existing shg_users. The DM = an existing shg_admin_user holding
-- the new perm_rol permission below; there is no separate profile/role table.

-- ─── Guild config ────────────────────────────────────────────────────────────

create table if not exists shg_rol_guild (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_url   text,
  supplies    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Singleton in practice: app reads/writes the one seeded row below, never inserts another.

create table if not exists shg_rol_guild_feature (
  id           uuid primary key default gen_random_uuid(),
  guild_id     uuid not null references shg_rol_guild(id) on delete cascade,
  title        text not null,
  description  text not null,
  benefit      text,   -- highlighted benefit line, optional
  unlocked     boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists shg_rol_guild_feature_guild_idx on shg_rol_guild_feature (guild_id);

create table if not exists shg_rol_guild_rank (
  id                uuid primary key default gen_random_uuid(),
  guild_id          uuid not null references shg_rol_guild(id) on delete cascade,
  name              text not null,
  points_threshold  int  not null,
  sort_order        int  not null default 0
);
create index if not exists shg_rol_guild_rank_guild_idx on shg_rol_guild_rank (guild_id);

-- ─── Characters (Fabula Ultima) ──────────────────────────────────────────────

create table if not exists shg_rol_character (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references shg_users(id) on delete cascade,
  name           text not null,
  -- Full Fabula Ultima sheet (classes/skills, attributes, HP/MP/IP, bonds,
  -- traits, equipment/inventory) — flexible shape, validated at the app
  -- layer with lib/validation/rol.ts's fuCharacterSheetSchema, not rigid
  -- columns here.
  sheet_data     jsonb not null default '{}'::jsonb,
  guild_rank_id  uuid references shg_rol_guild_rank(id) on delete set null,
  guild_points   int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists shg_rol_character_owner_idx on shg_rol_character (owner_id);
-- Max 2 characters per owner is enforced at the app layer (POST /api/rol/characters), not here.

-- ─── Map ──────────────────────────────────────────────────────────────────────

create table if not exists shg_rol_map (
  id          uuid primary key default gen_random_uuid(),
  guild_id    uuid not null references shg_rol_guild(id) on delete cascade,
  image_url   text
);

create table if not exists shg_rol_location (
  id            uuid primary key default gen_random_uuid(),
  map_id        uuid not null references shg_rol_map(id) on delete cascade,
  name          text not null,
  type          text not null, -- town/city/fortress/tower/mine/forest/ruin/...
  description   text not null,
  x_pct         numeric not null, -- position as % of image width
  y_pct         numeric not null,
  discovered    boolean not null default false,
  icon_url      text, -- optional override; else a per-type default icon in the UI
  created_at    timestamptz not null default now()
);
create index if not exists shg_rol_location_map_idx on shg_rol_location (map_id);

-- ─── Quests ─────────────────────────────────────────────────────────────────

create type shg_rol_quest_status as enum ('available', 'active', 'completed');

create table if not exists shg_rol_quest (
  id                uuid primary key default gen_random_uuid(),
  location_id       uuid references shg_rol_location(id) on delete set null, -- optional: quest tied to a map location
  title             text not null,
  description       text not null,
  status            shg_rol_quest_status not null default 'available',
  reward_coin       int not null default 0,
  reward_standing   int not null default 0,
  reward_supplies   int not null default 0,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz,
  completed_by      uuid references shg_admin_users(id) on delete set null
);
create index if not exists shg_rol_quest_status_idx   on shg_rol_quest (status);
create index if not exists shg_rol_quest_location_idx on shg_rol_quest (location_id);

create table if not exists shg_rol_quest_participant (
  quest_id      uuid not null references shg_rol_quest(id) on delete cascade,
  character_id  uuid not null references shg_rol_character(id) on delete cascade,
  primary key (quest_id, character_id)
);
create index if not exists shg_rol_quest_participant_character_idx on shg_rol_quest_participant (character_id);

create type shg_rol_note_visibility as enum ('public', 'dm_private', 'player_private');

create table if not exists shg_rol_quest_note (
  id            uuid primary key default gen_random_uuid(),
  quest_id      uuid not null references shg_rol_quest(id) on delete cascade,
  visibility    shg_rol_note_visibility not null,
  -- Scopes a player_private note to one participant's thread; null for public/dm_private.
  character_id  uuid references shg_rol_character(id) on delete cascade,
  -- Author is either a shg_user (player) or shg_admin_user (DM) — two separate
  -- identity tables (see 001_shg_init.sql), so no single FK target; author_kind
  -- disambiguates which table author_id points into.
  author_id     uuid not null,
  author_kind   text not null check (author_kind in ('player', 'admin')),
  content       text not null,
  created_at    timestamptz not null default now()
);
create index if not exists shg_rol_quest_note_quest_idx on shg_rol_quest_note (quest_id, visibility);

-- Guild history = select * from shg_rol_quest where status = 'completed', joined
-- to shg_rol_quest_participant/shg_rol_character. No separate table needed —
-- quests never revert to 'available', so this is already a stable, permanent log.

-- ─── Auto-update updated_at ──────────────────────────────────────────────────
-- Reuses shg_set_updated_at(), defined in 001_shg_init.sql.

create or replace trigger trg_shg_rol_guild_updated_at
  before update on shg_rol_guild for each row execute function shg_set_updated_at();
create or replace trigger trg_shg_rol_character_updated_at
  before update on shg_rol_character for each row execute function shg_set_updated_at();

-- ─── Quest completion RPC ─────────────────────────────────────────────────────
-- Atomic, row-locked reward application — mirrors shg_approve_booking's
-- check-then-act pattern in 001_shg_init.sql. Applies reward_standing to every
-- participating character's guild_points (recomputing guild_rank_id against
-- the guild's rank thresholds), reward_supplies to the guild, then flips the
-- quest to 'completed'. Never reverts — callers must check status = 'active'
-- themselves before calling, but the row lock + status check here is the real
-- guard against a double-completion race.

create or replace function shg_rol_complete_quest(p_quest_id uuid, p_admin_id uuid)
returns shg_rol_quest language plpgsql as $$
declare
  v_quest shg_rol_quest;
  v_guild_id uuid;
  v_participant record;
  v_new_points int;
  v_rank_id uuid;
begin
  select * into v_quest from shg_rol_quest where id = p_quest_id and status = 'active' for update;
  if v_quest.id is null then
    raise exception 'Quest not found or not active';
  end if;

  select id into v_guild_id from shg_rol_guild limit 1;

  for v_participant in
    select character_id from shg_rol_quest_participant where quest_id = p_quest_id
  loop
    update shg_rol_character
      set guild_points = guild_points + v_quest.reward_standing
      where id = v_participant.character_id
      returning guild_points into v_new_points;

    select id into v_rank_id
      from shg_rol_guild_rank
      where guild_id = v_guild_id and points_threshold <= v_new_points
      order by points_threshold desc
      limit 1;

    update shg_rol_character set guild_rank_id = v_rank_id where id = v_participant.character_id;
  end loop;

  update shg_rol_guild set supplies = supplies + v_quest.reward_supplies where id = v_guild_id;

  update shg_rol_quest
    set status = 'completed', completed_at = now(), completed_by = p_admin_id
    where id = p_quest_id
    returning * into v_quest;

  return v_quest;
end;
$$;

-- ─── Seed: the one Guild + its one Map ────────────────────────────────────────

insert into shg_rol_guild (name)
select 'Story Hunters Guild'
where not exists (select 1 from shg_rol_guild);

insert into shg_rol_map (guild_id)
select g.id from shg_rol_guild g
where not exists (select 1 from shg_rol_map)
limit 1;

-- ─── Admin permission ─────────────────────────────────────────────────────────

alter table shg_security_roles add column if not exists perm_rol boolean not null default false;

-- ─── shg_service GRANTs ────────────────────────────────────────────────────────
-- The actual access boundary (independent of RLS) — see 002_shg_scoped_role.sql.

grant select, insert, update, delete on
  shg_rol_guild, shg_rol_guild_feature, shg_rol_guild_rank, shg_rol_character,
  shg_rol_map, shg_rol_location, shg_rol_quest, shg_rol_quest_participant, shg_rol_quest_note
  to shg_service;

grant execute on function shg_rol_complete_quest(uuid, uuid) to shg_service;

-- ─── RLS — enabled everywhere, no policies (see header comment) ───────────────

alter table shg_rol_guild             enable row level security;
alter table shg_rol_guild_feature     enable row level security;
alter table shg_rol_guild_rank        enable row level security;
alter table shg_rol_character         enable row level security;
alter table shg_rol_map               enable row level security;
alter table shg_rol_location          enable row level security;
alter table shg_rol_quest             enable row level security;
alter table shg_rol_quest_participant enable row level security;
alter table shg_rol_quest_note        enable row level security;
