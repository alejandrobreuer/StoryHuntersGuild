-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: NPC multi-faction, origin, portraits
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 022_shg_rol_location_icon_outline.sql. An NPC can belong to
-- several factions, and be a FORMER member of any of them ("Ex-<faction>" in
-- the UI) — so the single faction_id column becomes a join table with an
-- is_former flag. Also adds an origin location (distinct from residence,
-- which is where they live NOW) and two portrait images for the /rol/npcs
-- detail popup.

create table if not exists shg_rol_npc_faction (
  npc_id     uuid not null references shg_rol_npc(id) on delete cascade,
  faction_id uuid not null references shg_rol_faction(id) on delete cascade,
  is_former  boolean not null default false,
  primary key (npc_id, faction_id)
);
create index if not exists shg_rol_npc_faction_faction_idx on shg_rol_npc_faction (faction_id);

drop index if exists shg_rol_npc_faction_idx;
alter table shg_rol_npc drop column if exists faction_id;

alter table shg_rol_npc add column if not exists origin_location_id uuid references shg_rol_location(id) on delete set null;
create index if not exists shg_rol_npc_origin_idx on shg_rol_npc (origin_location_id);

alter table shg_rol_npc add column if not exists portrait_url text;
alter table shg_rol_npc add column if not exists full_body_url text;

grant select, insert, update, delete on shg_rol_npc_faction to shg_service;
alter table shg_rol_npc_faction enable row level security;
