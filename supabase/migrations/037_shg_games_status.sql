-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — replace the games "available" flag with a 3-state status
-- ═══════════════════════════════════════════════════════════════════════════
-- `available` (boolean, added in 004) only ever distinguished "available"
-- from "not available" as a display flag — unavailable games always stayed
-- visible in the Ludoteca, just badged. The library now needs a third state
-- ("request ahead of time"), so this replaces the boolean with a proper
-- status column instead of bolting on a second flag.

alter table shg_games
  add column if not exists status text not null default 'available'
    check (status in ('available', 'unavailable', 'request_ahead'));

update shg_games set status = 'unavailable' where available = false;

alter table shg_games drop column if exists available;
