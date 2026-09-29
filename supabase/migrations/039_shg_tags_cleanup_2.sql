-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — second tag catalog pass (2026-09-29)
-- ═══════════════════════════════════════════════════════════════════════════
-- Follow-up to 038_shg_tags_cleanup.sql, per explicit editorial direction:
--
--   • ciencia ficcion — removed. It's a theme/genre, not a mechanic or
--     gameplay tag, which is what this catalog is meant to describe
--     (5 games affected: Leaders of Euphoria, Scythe, Star Wars: Imperial
--     Assault, Tiny Epic Galaxies, Tiny Epic Mechs).
--   • deduccion social — removed, merged into the existing "deduccion" tag
--     (too similar to keep both). Before deleting, "deduccion" was added to
--     the 3 games that had "deduccion social" but not already "deduccion"
--     (Leaders of Euphoria, BANG!, Feed the Kraken) — The Mind already had
--     both, so it needed no change.
--   • exploracion de mazmorras — renamed to "crawler" (shorter, and
--     "dungeon crawler" is the recognized genre term). Propagates
--     automatically via trg_shg_tags_propagate_rename (009_shg_tags.sql)
--     to its 3 games (Dungeon Academy, Middara: Act 1, Tiny Epic Dungeons).
--   • farol — removed (5 games affected: Welcome to the Dungeon, BANG!,
--     Feed the Kraken, Liar's UNO, Twisted Cryptids).
--
-- Catalog goes from 26 to 23 tags. Applied live via the admin API
-- (games PATCHed to add "deduccion" first, then the three tag deletes and
-- one rename via /api/admin/tags) — this file documents the equivalent SQL
-- for the record. shg_games.tags is kept in sync automatically by the
-- existing triggers from 009_shg_tags.sql; the manual UPDATE below is only
-- for the "deduccion social" → "deduccion" merge, since a plain rename
-- would have collided with the tag that already existed.

update shg_games
  set tags = array_append(tags, 'deduccion'), updated_at = now()
  where 'deduccion social' = any(tags)
    and not ('deduccion' = any(tags));

delete from shg_tags where name in ('ciencia ficcion', 'deduccion social', 'farol');

update shg_tags set name = 'crawler' where name = 'exploracion de mazmorras';
