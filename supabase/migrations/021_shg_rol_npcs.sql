-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: NPCs & factions
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 020_shg_rol_guild_description.sql. DM-authored NPC roster:
-- residence comes from the existing world map (shg_rol_location), faction is
-- a small DM-managed catalog of its own, standing is the NPC's overall
-- feeling toward the guild. Same access model as the rest of the Rol
-- section — see 019_shg_rol_init.sql's header comment (RLS enabled, zero
-- policies, access boundary is shg_service GRANTs + Next.js API routes).

create table if not exists shg_rol_faction (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create type shg_rol_npc_standing as enum ('hostile', 'unfriendly', 'neutral', 'friendly', 'allied');

create table if not exists shg_rol_npc (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  description            text not null,
  residence_location_id  uuid references shg_rol_location(id) on delete set null,
  faction_id             uuid references shg_rol_faction(id) on delete set null,
  standing               shg_rol_npc_standing not null default 'neutral',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists shg_rol_npc_residence_idx on shg_rol_npc (residence_location_id);
create index if not exists shg_rol_npc_faction_idx   on shg_rol_npc (faction_id);

create or replace trigger trg_shg_rol_npc_updated_at
  before update on shg_rol_npc for each row execute function shg_set_updated_at();

grant select, insert, update, delete on shg_rol_faction, shg_rol_npc to shg_service;

alter table shg_rol_faction enable row level security;
alter table shg_rol_npc     enable row level security;
