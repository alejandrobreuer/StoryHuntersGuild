-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — a game can have more than one owner
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 047_shg_admin_notifications.sql. Replaces shg_games.owner_id
-- (single FK from 042_shg_game_owners.sql) with owner_ids uuid[], same
-- shape as shg_games.tags. Still admin-only: public queries keep listing
-- explicit columns, so this never reaches a public page.
--
-- An array can't carry an FK, so a trigger strips a deleted owner's id from
-- every game — the equivalent of the old ON DELETE SET NULL.
--
-- Non-breaking on purpose: owner_id is kept so code still reading it keeps
-- working while this rolls out. It's dropped in 049 once the new code is live.

alter table shg_games
  add column if not exists owner_ids uuid[] not null default '{}';

update shg_games
set owner_ids = array[owner_id]
where owner_id is not null and owner_ids = '{}';

create or replace function shg_game_owners_unassign()
returns trigger
language plpgsql
as $$
begin
  update shg_games
  set owner_ids = array_remove(owner_ids, old.id)
  where old.id = any(owner_ids);
  return old;
end;
$$;

drop trigger if exists shg_game_owners_unassign on shg_game_owners;
create trigger shg_game_owners_unassign
  before delete on shg_game_owners
  for each row execute function shg_game_owners_unassign();
