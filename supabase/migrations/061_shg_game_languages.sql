-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — game languages
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 060_shg_rules_pdfs.sql. Staff manage the list in
-- Configuración → Idiomas (a short code like "EN" plus a name like "Inglés")
-- and pick one or more per game in Admin → Juegos. The Ludoteca shows the
-- codes on each card.
--
-- Same shape as owners (042 + 048): a lookup table plus a uuid[] on
-- shg_games. An array can't carry an FK, so a trigger strips a deleted
-- language's id from every game. Unlike owner_ids this is public data:
-- app/games/page.tsx selects language_ids.

create table if not exists shg_languages (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null unique,
  created_at  timestamptz not null default now()
);

alter table shg_languages enable row level security;
-- No public policy: read and written only through the service client.

grant select, insert, update, delete on shg_languages to shg_service;

insert into shg_languages (code, name) values
  ('ES', 'Español'),
  ('EN', 'Inglés')
on conflict do nothing;

alter table shg_games
  add column if not exists language_ids uuid[] not null default '{}';

create or replace function shg_languages_unassign()
returns trigger
language plpgsql
as $$
begin
  update shg_games
  set language_ids = array_remove(language_ids, old.id)
  where old.id = any(language_ids);
  return old;
end;
$$;

drop trigger if exists shg_languages_unassign on shg_languages;
create trigger shg_languages_unassign
  before delete on shg_languages
  for each row execute function shg_languages_unassign();
