-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — attendance tracking on bookings
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 006_shg_reserve_pending_capacity.sql. Tracked per booking (not
-- per individual guest, since only the registrant is named — guest_count is
-- just a party size) so it can drive attendance metrics later: people per
-- event = sum(guest_count) where attended, events per person = count(distinct
-- event_id) grouped by email where attended.

alter table shg_bookings
  add column if not exists attended boolean not null default false;

create index if not exists shg_bookings_attended_idx on shg_bookings (attended) where attended = true;
