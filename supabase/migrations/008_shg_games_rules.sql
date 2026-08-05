-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — game rules text
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 007_shg_booking_attendance.sql. Stored as plain text using a
-- small custom markup (see lib/rules-markup.ts) — headings, bullet lists,
-- bold, and colored callouts — parsed and rendered client-side, no HTML
-- ever stored or trusted.

alter table shg_games add column if not exists rules text;
