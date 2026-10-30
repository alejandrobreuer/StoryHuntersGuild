-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — RP granted by an attendance row
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 055_shg_finance_edit_bookings.sql.
--
-- Admin › Usuarios can now add an event participation by hand. When the
-- player has a booking for that event, the event's RP reward is recorded on
-- the booking (shg_bookings.rp_awarded, same as ticking attendance in
-- Reservas). When there's no booking, it's recorded here instead, so removing
-- the participation reverses exactly what was granted — even if the event's
-- reward_rp is edited afterwards.

alter table shg_event_attendance
  add column if not exists rp_awarded int not null default 0;
