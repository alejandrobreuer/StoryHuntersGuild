-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Instagram link + logo image on venues
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 004_shg_games_bgg_available.sql. Both are optional display
-- fields, hidden on the public event page when blank, same as the game
-- bgg_link pattern.

alter table shg_venues
  add column if not exists instagram_url text,
  add column if not exists logo_url      text;
