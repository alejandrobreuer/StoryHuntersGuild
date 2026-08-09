-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — predefined game tags
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 008_shg_games_rules.sql. Introduces a canonical tag list so the
-- admin can no longer free-type arbitrary tag strings onto a game — every
-- tag on shg_games.tags must come from this table. shg_games.tags stays a
-- plain text[] (unchanged shape, so the public Ludoteca's existing
-- overlaps("tags", ...) filter and GameCard/GameFilters keep working
-- untouched) — shg_tags is the admin-managed source of truth for which tag
-- *names* are valid, and rename/delete here propagates into every game's
-- tags array via triggers, so the two can never drift apart.

create table if not exists shg_tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Seed from whatever tag strings already exist across shg_games, so
-- existing data doesn't become "invalid" the moment this ships.
insert into shg_tags (name)
select distinct unnest(tags) from shg_games
on conflict (name) do nothing;

alter table shg_tags enable row level security;
-- No public policy — tags are only ever read/written through the admin API
-- (shg_service role), same as shg_venues.

grant select, insert, update, delete on shg_tags to shg_service;

create or replace trigger trg_shg_tags_updated_at
  before update on shg_tags for each row execute function shg_set_updated_at();

-- Renaming a tag propagates into every game currently carrying the old
-- name, so shg_games.tags and shg_tags can't silently drift apart.
create or replace function shg_propagate_tag_rename()
returns trigger language plpgsql as $$
begin
  if new.name is distinct from old.name then
    update shg_games
      set tags = array_replace(tags, old.name, new.name), updated_at = now()
      where old.name = any(tags);
  end if;
  return new;
end;
$$;
create or replace trigger trg_shg_tags_propagate_rename
  after update on shg_tags
  for each row execute function shg_propagate_tag_rename();

-- Deleting a tag strips it from every game's tags array.
create or replace function shg_propagate_tag_delete()
returns trigger language plpgsql as $$
begin
  update shg_games
    set tags = array_remove(tags, old.name), updated_at = now()
    where old.name = any(tags);
  return old;
end;
$$;
create or replace trigger trg_shg_tags_propagate_delete
  after delete on shg_tags
  for each row execute function shg_propagate_tag_delete();

-- A game's tags must all come from shg_tags — predefined, not free text.
create or replace function shg_validate_game_tags()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from unnest(new.tags) t
    where not exists (select 1 from shg_tags where name = t)
  ) then
    raise exception 'Unknown tag(s) — all game tags must exist in shg_tags.';
  end if;
  return new;
end;
$$;
create or replace trigger trg_shg_games_validate_tags
  before insert or update of tags on shg_games
  for each row execute function shg_validate_game_tags();
