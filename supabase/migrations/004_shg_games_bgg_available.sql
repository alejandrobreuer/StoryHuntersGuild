-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — BGG link + availability flag on games
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 003_shg_storage.sql. Unavailable games stay in the library and
-- keep showing in the Ludoteca — `available` is just a display flag, not a
-- filter — so no RLS/grant changes are needed here.

alter table shg_games
  add column if not exists bgg_link  text,
  add column if not exists available boolean not null default true;
