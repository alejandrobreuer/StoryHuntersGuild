-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Custom security roles for the admin panel
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 012_shg_profile_icons.sql. Replaces the hardcoded admin/owner
-- text role (which was stored but never actually checked anywhere in the
-- code — every admin could already do everything) with admin-editable
-- roles, each toggling access to the admin panel itself plus one flag per
-- admin panel section. `can_access_admin` lets a role be locked out of the
-- panel entirely while still existing (e.g. a former staff member you want
-- to keep on record without deleting).
--
-- Both seeded roles get every permission — this preserves exactly today's
-- behavior (unrestricted) for every existing admin account, so applying
-- this migration cannot lock anyone out. Create more restrictive custom
-- roles afterward from /admin/roles for new staff.

create table if not exists shg_security_roles (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null unique,
  description        text,
  can_access_admin   boolean not null default true,
  perm_events        boolean not null default false,
  perm_venues        boolean not null default false,
  perm_games         boolean not null default false,
  perm_tags          boolean not null default false,
  perm_users         boolean not null default false,
  perm_quests        boolean not null default false,
  perm_ranks         boolean not null default false,
  perm_badges        boolean not null default false,
  perm_feature_flags boolean not null default false,
  perm_bookings      boolean not null default false,
  perm_reports       boolean not null default false,
  perm_settings      boolean not null default false,
  perm_roles         boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

insert into shg_security_roles (
  name, description, can_access_admin,
  perm_events, perm_venues, perm_games, perm_tags, perm_users, perm_quests,
  perm_ranks, perm_badges, perm_feature_flags, perm_bookings, perm_reports,
  perm_settings, perm_roles
) values
  ('Dueño', 'Acceso total, incluyendo la gestión de roles y administradores.', true,
   true, true, true, true, true, true, true, true, true, true, true, true, true),
  ('Administrador', 'Acceso total al panel (rol heredado de antes de los roles personalizados).', true,
   true, true, true, true, true, true, true, true, true, true, true, true, true)
on conflict (name) do nothing;

alter table shg_admin_users add column if not exists role_id uuid references shg_security_roles(id) on delete restrict;

update shg_admin_users au
set role_id = sr.id
from shg_security_roles sr
where au.role_id is null
  and sr.name = case when au.role = 'owner' then 'Dueño' else 'Administrador' end;

alter table shg_admin_users alter column role_id set not null;
alter table shg_admin_users drop column if exists role;

alter table shg_security_roles enable row level security;
grant select, insert, update, delete on shg_security_roles to shg_service;

create trigger shg_security_roles_set_updated_at
  before update on shg_security_roles
  for each row execute function shg_set_updated_at();
