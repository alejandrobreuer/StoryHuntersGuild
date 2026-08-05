-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — reserve capacity for pending bookings too
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 005_shg_venues_instagram_logo.sql. shg_event_remaining previously
-- only summed 'approved' bookings, so a booking sitting in 'pending' review
-- didn't reserve its seat — the same spot stayed bookable by someone else
-- until an admin got around to approving it.
--
-- Pending bookings now count toward remaining capacity too. Rejecting a
-- pending booking (or cancelling an approved one) automatically frees the
-- seat again, since both end states fall out of the ('approved','pending')
-- filter — no other code changes needed, every page/route already reads
-- remaining capacity from this one view.

create or replace view shg_event_remaining as
select
  e.id as event_id, e.capacity,
  e.capacity - coalesce(sum(b.guest_count) filter (where b.status in ('approved','pending')), 0) as remaining
from shg_events e
left join shg_bookings b on b.event_id = e.id
group by e.id, e.capacity;
