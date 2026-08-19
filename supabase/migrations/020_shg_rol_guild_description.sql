-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: guild description / news
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 019_shg_rol_init.sql. Freeform text the DM edits from
-- /rol/settings to post what the guild is up to — shown on the /rol page.

alter table shg_rol_guild add column if not exists description text;
