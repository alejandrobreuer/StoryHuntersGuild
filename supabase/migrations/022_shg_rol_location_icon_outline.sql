-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: outlined location icons
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 021_shg_rol_npcs.sql. shg_rol_location.icon_url already holds a
-- GM-uploaded custom marker PNG; icon_url now points at the OUTLINED variant
-- baked by lib/rol/iconOutline.ts (see app/api/admin/rol/locations/icon/
-- route.ts), while icon_source_url keeps the original pristine upload so the
-- outline can be regenerated later (color change, algorithm tweak, bulk
-- backfill via scripts/generate-icon-outlines.ts) without re-uploading art.

alter table shg_rol_location add column if not exists icon_source_url text;
alter table shg_rol_location add column if not exists icon_outline_color text not null default 'black'
  check (icon_outline_color in ('black', 'red', 'white'));
