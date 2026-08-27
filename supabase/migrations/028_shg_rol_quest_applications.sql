-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: mission applications (Phase 2 of the mission flow)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 027_shg_rol_guild_status.sql. Missions get a party-size cap, a
-- scheduled date, and how many sessions they're expected to run. Players now
-- APPLY to an available mission with one of their characters instead of the
-- DM hand-picking participants; the DM reviews each application (approve or
-- reject) and, on "Start", every approved application becomes a real
-- shg_rol_quest_participant row — any application still pending at that
-- point is auto-rejected. shg_rol_quest_participant itself, and everything
-- downstream of it (notes, the completion RPC), is untouched.

alter table shg_rol_quest add column if not exists max_participants int not null default 4;
alter table shg_rol_quest add column if not exists scheduled_date date;
alter table shg_rol_quest add column if not exists session_count int not null default 1;

create type shg_rol_quest_application_status as enum ('pending', 'approved', 'rejected');

create table if not exists shg_rol_quest_application (
  id            uuid primary key default gen_random_uuid(),
  quest_id      uuid not null references shg_rol_quest(id) on delete cascade,
  character_id  uuid not null references shg_rol_character(id) on delete cascade,
  status        shg_rol_quest_application_status not null default 'pending',
  applied_at    timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid references shg_admin_users(id) on delete set null,
  unique (quest_id, character_id)
);
create index if not exists shg_rol_quest_application_quest_idx on shg_rol_quest_application (quest_id, status);
create index if not exists shg_rol_quest_application_character_idx on shg_rol_quest_application (character_id);

grant select, insert, update, delete on shg_rol_quest_application to shg_service;
alter table shg_rol_quest_application enable row level security;
