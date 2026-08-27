-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: hide NPCs from players
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 025_shg_rol_faction_sort_order.sql. Defaults to visible (false)
-- so existing NPCs don't vanish the moment this ships — a GM opts specific
-- NPCs into hidden, same direction as most "reveal to players" toggles in
-- this app defaulting to the safe/unsurprising state.

alter table shg_rol_npc add column if not exists hidden boolean not null default false;
