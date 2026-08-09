-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rank and Badge icon images
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 011_shg_gamification.sql. Admin-uploadable images (via the
-- existing /api/admin/media + shg-media bucket pipeline) shown on the
-- Adventurer Profile page; falls back to the existing emoji `icon` field
-- (badges) or a default crest icon (ranks) when unset.

alter table shg_ranks
  add column if not exists icon_url text;

alter table shg_badges
  add column if not exists icon_url text;
