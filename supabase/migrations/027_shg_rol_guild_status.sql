-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: Guild Status tiers + feature cost/requirements
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 026_shg_rol_npc_hidden.sql. Phase 1 of the mission-reward flow:
-- Guild Status is a tier the GM promotes the guild through by hand (not
-- computed from any number, unlike shg_rol_guild_rank's points_threshold —
-- this is a story beat the GM declares) that gates which features are even
-- eligible to receive supplies. Each feature also gets a supplies cost and a
-- running allocated total; a later migration will add the mission mechanic
-- that increments supplies_allocated and auto-unlocks the feature once it
-- reaches cost_supplies. The existing `unlocked` flag stays as a manual GM
-- override in the meantime (and after).

create table if not exists shg_rol_guild_status (
  id          uuid primary key default gen_random_uuid(),
  guild_id    uuid not null references shg_rol_guild(id) on delete cascade,
  name        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists shg_rol_guild_status_guild_idx on shg_rol_guild_status (guild_id);

alter table shg_rol_guild add column if not exists current_guild_status_id uuid references shg_rol_guild_status(id) on delete set null;

alter table shg_rol_guild_feature add column if not exists guild_status_id uuid references shg_rol_guild_status(id) on delete set null;
alter table shg_rol_guild_feature add column if not exists cost_supplies int not null default 0;
alter table shg_rol_guild_feature add column if not exists supplies_allocated int not null default 0;

grant select, insert, update, delete on shg_rol_guild_status to shg_service;
alter table shg_rol_guild_status enable row level security;
