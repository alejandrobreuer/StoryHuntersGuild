-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — an account for everyone who booked without one
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 056_shg_event_attendance_rp.sql. Safe to run more than once.
--
-- Booking now requires an account. This creates one for every email that
-- booked before that, so staff can assign mission XP / attendance to them in
-- Admin › Usuarios right away, and links their bookings to it.
--
-- The accounts are created WITHOUT a password (password_hash null), not with a
-- shared temporary one: anyone who knew that password and someone's email
-- could sign in as them. Instead, when the person tries to sign up or sign in
-- with that email, the site emails them a link to choose their own password
-- (proving the inbox is theirs). XP, RP, badges and bookings are all waiting
-- in the account when they do.
--
-- ── Preview first (read-only) — who would get an account: ──────────────────
--
--   select lower(trim(b.email)) as email,
--          (array_agg(b.name order by b.created_at desc))[1] as name,
--          count(*) as bookings
--   from shg_bookings b
--   where not exists (select 1 from shg_users u where u.email = lower(trim(b.email)))
--   group by lower(trim(b.email))
--   order by email;

-- ─── 1. Create the missing accounts ─────────────────────────────────────────
-- Name and phone come from the email's most recent booking.

insert into shg_users (email, name, phone, password_hash)
select email, name, phone, null
from (
  select lower(trim(b.email)) as email,
         (array_agg(nullif(trim(b.name), '')  order by b.created_at desc) filter (where nullif(trim(b.name), '')  is not null))[1] as name,
         (array_agg(nullif(trim(b.phone), '') order by b.created_at desc) filter (where nullif(trim(b.phone), '') is not null))[1] as phone
  from shg_bookings b
  where b.email is not null and trim(b.email) <> ''
  group by lower(trim(b.email))
) latest
where not exists (select 1 from shg_users u where u.email = latest.email)
on conflict (email) do nothing;

-- ─── 2. Link every booking that has no account to the one for its email ─────
-- Also covers bookings by people who signed up on their own later.

update shg_bookings b
set user_id = u.id
from shg_users u
where b.user_id is null
  and u.email = lower(trim(b.email));

-- ─── Result ─────────────────────────────────────────────────────────────────

select
  (select count(*) from shg_users where password_hash is null)  as cuentas_sin_contrasena,
  (select count(*) from shg_bookings where user_id is null)      as reservas_sin_cuenta;
