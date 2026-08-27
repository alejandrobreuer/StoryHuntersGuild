-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: character portrait + full-body images
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 031_shg_rol_quest_history_summary.sql. Same shape as NPCs
-- (shg_rol_npc.portrait_url/full_body_url) — portrait is the small always-
-- visible headshot near the name, full_body is shown in the sheet's
-- collapsible left-edge drawer.

alter table shg_rol_character add column if not exists portrait_url text;
alter table shg_rol_character add column if not exists full_body_url text;
