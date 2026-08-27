-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: faction display order
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 024_shg_rol_npc_tags.sql. GM-editable ordering for the faction
-- section dividers on /rol/npcs (and the admin's faction list/picker) — same
-- shape as shg_rol_guild_feature.sort_order / shg_rol_guild_rank.sort_order.

alter table shg_rol_faction add column if not exists sort_order int not null default 0;
