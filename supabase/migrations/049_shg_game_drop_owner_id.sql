-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — drop the legacy single-owner column
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 048_shg_game_multiple_owners.sql, and only once the code that
-- uses shg_games.owner_ids is deployed. Re-syncs owner_ids first in case a
-- game's owner was changed through the old code in the meantime.

update shg_games
set owner_ids = array[owner_id]
where owner_id is not null and not (owner_id = any(owner_ids));

alter table shg_games drop column if exists owner_id;
