-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — private admin notes on player accounts
-- ═══════════════════════════════════════════════════════════════════════════
-- Free-text notes staff keep about a player (Admin › Usuarios). Only the
-- admin users endpoints select this column; every player-facing query lists
-- its columns explicitly, so the note never reaches the player.

alter table shg_users add column if not exists admin_notes text;
