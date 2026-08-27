-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: NPC role tags (merchant, militia, etc.)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 023_shg_rol_npc_factions_origin_portraits.sql. Factions stay
-- exactly as they are — political/social allegiance, an NPC can hold several,
-- current or "Ex-". This adds a SEPARATE catalog of descriptive role tags
-- (merchant, militia, blacksmith, ...) any NPC can carry any number of,
-- independent of faction. Mirrors 009_shg_tags's catalog + text[] +
-- propagate-rename/delete pattern exactly, scoped to its own table so it
-- doesn't share a namespace with the unrelated game-catalog tags.

create table if not exists shg_rol_npc_tag (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table shg_rol_npc add column if not exists tags text[] not null default '{}';

alter table shg_rol_npc_tag enable row level security;
grant select, insert, update, delete on shg_rol_npc_tag to shg_service;

create or replace trigger trg_shg_rol_npc_tag_updated_at
  before update on shg_rol_npc_tag for each row execute function shg_set_updated_at();

-- Renaming a tag propagates into every NPC currently carrying the old name.
create or replace function shg_propagate_rol_npc_tag_rename()
returns trigger language plpgsql as $$
begin
  if new.name is distinct from old.name then
    update shg_rol_npc
      set tags = array_replace(tags, old.name, new.name), updated_at = now()
      where old.name = any(tags);
  end if;
  return new;
end;
$$;
create or replace trigger trg_shg_rol_npc_tag_propagate_rename
  after update on shg_rol_npc_tag
  for each row execute function shg_propagate_rol_npc_tag_rename();

-- Deleting a tag strips it from every NPC's tags array.
create or replace function shg_propagate_rol_npc_tag_delete()
returns trigger language plpgsql as $$
begin
  update shg_rol_npc
    set tags = array_remove(tags, old.name), updated_at = now()
    where old.name = any(tags);
  return old;
end;
$$;
create or replace trigger trg_shg_rol_npc_tag_propagate_delete
  after delete on shg_rol_npc_tag
  for each row execute function shg_propagate_rol_npc_tag_delete();

-- An NPC's tags must all come from shg_rol_npc_tag — predefined, not free text.
create or replace function shg_validate_rol_npc_tags()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from unnest(new.tags) t
    where not exists (select 1 from shg_rol_npc_tag where name = t)
  ) then
    raise exception 'Unknown tag(s) — all NPC tags must exist in shg_rol_npc_tag.';
  end if;
  return new;
end;
$$;
create or replace trigger trg_shg_rol_npc_validate_tags
  before insert or update of tags on shg_rol_npc
  for each row execute function shg_validate_rol_npc_tags();
