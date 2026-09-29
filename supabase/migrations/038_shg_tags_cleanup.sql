-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — prune the game tag catalog
-- ═══════════════════════════════════════════════════════════════════════════
-- Audit of the live Ludoteca (2026-09-29): 42 tags across 56 games, but the
-- distribution is long-tailed — half the catalog sat on just 1-2 games — and
-- a couple of tags didn't earn their keep. This is a one-time content
-- cleanup, not a schema change.
--
-- Removed, and why:
--   • estrategia liviana, casual — redundant with the Ludoteca's own
--     "Complejidad" filter (light/medium/heavy already lives on
--     shg_games.complexity), and largely duplicate each other's meaning.
--   • filler — untranslated English loanword; every other tag has a
--     Spanish name.
--   • 13 tags used on exactly one game each (comercio, construccion de
--     rutas, control de area, descarte, dos jugadores, gestion de mano,
--     juego de palabras, rompecabezas, tematica de monstruos, tematica de
--     naturaleza, tematica del viejo oeste, tematica policial, terror) —
--     real categories, just too sparse to work as a filter on a 56-game
--     library yet. Re-add via the admin Tags settings page if a future
--     game makes one worth reintroducing.
--
-- Only shg_tags is touched directly here. shg_games.tags (text[]) is kept
-- in sync automatically by the existing trg_shg_tags_propagate_delete
-- trigger from 009_shg_tags.sql, which strips each deleted tag's name out
-- of every game's tags array — so this single statement is what updates
-- both tables.
--
-- NOT covered here: 16 games currently have zero tags at all (7 Wonders,
-- 7 Wonders Duel, Azul, Brass: Birmingham, Dungeons & Drinks, Everdell,
-- Exploding Kittens, Flip 7, Hive, Middara: Act 1, Munchkin, Rivals of
-- Catan, Scythe, Spirit Island, Star Wars: Imperial Assault, Twisted
-- Cryptids). Assigning them tags needs a per-game editorial call, not a
-- mechanical query — handle separately via the admin panel.

delete from shg_tags
where name in (
  'estrategia liviana', 'casual', 'filler',
  'comercio', 'construccion de rutas', 'control de area', 'descarte',
  'dos jugadores', 'gestion de mano', 'juego de palabras', 'rompecabezas',
  'tematica de monstruos', 'tematica de naturaleza', 'tematica del viejo oeste',
  'tematica policial', 'terror'
);
