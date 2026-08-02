-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — initial schema
-- ═══════════════════════════════════════════════════════════════════════════
-- Lives in the SAME Postgres database as cardstash.ar. Every table/view here
-- is prefixed shg_ — that prefix is a hard boundary, not a convention: SHG
-- code must never read/write a table without it, and this migration must
-- never touch a non-shg_ table. See 002_shg_scoped_role.sql for the
-- database-level enforcement of that boundary (a GRANT-scoped Postgres role,
-- not a shared service-role key).
--
-- SHG does not use Supabase Auth (auth.users) — shg_users/shg_admin_users are
-- fully separate, deliberately duplicated identity tables. See lib/auth/*.

-- ─── Identity ────────────────────────────────────────────────────────────────

create table if not exists shg_users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  name           text,
  phone          text,
  created_at     timestamptz not null default now(),
  last_login_at  timestamptz
);

create table if not exists shg_admin_users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  name           text not null,
  role           text not null default 'admin' check (role in ('admin','owner')),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  last_login_at  timestamptz
);
-- First row inserted by hand via the Supabase SQL editor — one-time bootstrap,
-- no self-signup:
--   insert into shg_admin_users (email, name, role) values ('you@example.com', 'Your Name', 'owner');

create table if not exists shg_magic_link_tokens (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  purpose        text not null check (purpose in ('public','admin')),
  token_hash     text not null unique,      -- sha256(raw token); the raw token only ever exists in the emailed link
  expires_at     timestamptz not null,
  consumed_at    timestamptz,
  created_at     timestamptz not null default now(),
  requested_ip   text
);
create index if not exists shg_magic_link_tokens_email_idx   on shg_magic_link_tokens (email);
create index if not exists shg_magic_link_tokens_expires_idx on shg_magic_link_tokens (expires_at) where consumed_at is null;

-- ─── Site config ─────────────────────────────────────────────────────────────
-- Mirrors cardstash.ar's admin_settings key/value pattern.

create table if not exists shg_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

insert into shg_settings (key, value) values
  ('bank_transfer_instructions', 'CBU: 0000000000000000000000\nAlias: STORY.HUNTERS.GUILD\nTitular: Story Hunters\nEnviá el comprobante al reservar tu lugar.')
on conflict (key) do nothing;

-- ─── Catalog ─────────────────────────────────────────────────────────────────

create table if not exists shg_venues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null,
  city        text,
  map_url     text,               -- shown inline on the event-detail page
  notes       text,               -- admin-only logistics notes, never public
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists shg_games (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text not null unique,
  min_players        int  not null check (min_players > 0),
  max_players        int  not null check (max_players >= min_players),
  playtime_minutes   int  not null check (playtime_minutes > 0),
  complexity         text not null check (complexity in ('light','medium','heavy')),
  beginner_friendly  boolean not null default false,
  tags               text[] not null default '{}',
  image_url          text,
  description        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists shg_games_beginner_idx on shg_games (beginner_friendly) where beginner_friendly = true;
create index if not exists shg_games_tags_idx     on shg_games using gin (tags);

create table if not exists shg_events (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  slug               text not null unique,
  description        text,
  venue_id           uuid not null references shg_venues(id) on delete restrict,
  starts_at          timestamptz not null,
  ends_at            timestamptz,
  capacity           int  not null check (capacity > 0),
  price_per_person   numeric(12,2) not null check (price_per_person >= 0),
  currency           text not null default 'ARS',
  status             text not null default 'draft' check (status in ('draft','published','cancelled')),
  cover_image_url    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists shg_events_starts_at_idx on shg_events (starts_at);
create index if not exists shg_events_venue_idx     on shg_events (venue_id);
create index if not exists shg_events_status_idx    on shg_events (status);

create table if not exists shg_event_games (
  event_id  uuid not null references shg_events(id) on delete cascade,
  game_id   uuid not null references shg_games(id)  on delete cascade,
  primary key (event_id, game_id)
);

-- ─── Bookings ────────────────────────────────────────────────────────────────

create table if not exists shg_bookings (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references shg_events(id) on delete cascade,
  user_id        uuid references shg_users(id) on delete set null,   -- null for guest (no sign-in) bookings
  name           text not null,
  email          text not null,
  phone          text,
  guest_count    int  not null check (guest_count > 0),
  cost           numeric(12,2) not null check (cost >= 0),  -- snapshot: price_per_person * guest_count, computed server-side at submit
  status         text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  receipt_path   text,   -- path within the private shg-receipts bucket, not a public URL
  admin_note     text,
  reviewed_by    uuid references shg_admin_users(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists shg_bookings_event_idx        on shg_bookings (event_id);
create index if not exists shg_bookings_status_idx       on shg_bookings (status);
create index if not exists shg_bookings_user_idx         on shg_bookings (user_id);
create index if not exists shg_bookings_event_status_idx on shg_bookings (event_id, status);

-- ─── Live remaining-capacity view ────────────────────────────────────────────

create or replace view shg_event_remaining as
select
  e.id as event_id, e.capacity,
  e.capacity - coalesce(sum(b.guest_count) filter (where b.status = 'approved'), 0) as remaining
from shg_events e
left join shg_bookings b on b.event_id = e.id
group by e.id, e.capacity;

-- ─── Auto-update updated_at ──────────────────────────────────────────────────

create or replace function shg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_shg_venues_updated_at
  before update on shg_venues for each row execute function shg_set_updated_at();
create or replace trigger trg_shg_games_updated_at
  before update on shg_games for each row execute function shg_set_updated_at();
create or replace trigger trg_shg_events_updated_at
  before update on shg_events for each row execute function shg_set_updated_at();
create or replace trigger trg_shg_bookings_updated_at
  before update on shg_bookings for each row execute function shg_set_updated_at();

-- ─── Capacity/booking-approval RPCs ──────────────────────────────────────────
-- Remaining capacity is computed live (shg_event_remaining above), never a
-- stored/decremented counter — a live SUM() can't drift because it has no
-- independent state to drift from. The concurrency risk (two admins approving
-- past capacity at once) is closed with a single row-locked atomic function.

create or replace function shg_approve_booking(p_booking_id uuid, p_admin_id uuid)
returns shg_bookings language plpgsql as $$
declare
  v_booking shg_bookings;
  v_event_id uuid;
  v_capacity int;
  v_approved int;
  v_guests int;
begin
  select event_id, guest_count into v_event_id, v_guests
    from shg_bookings where id = p_booking_id and status = 'pending';
  if v_event_id is null then
    raise exception 'Booking not found or not pending';
  end if;

  -- Row-lock the event for the duration of this check-then-act sequence
  select capacity into v_capacity from shg_events where id = v_event_id for update;

  select coalesce(sum(guest_count), 0) into v_approved
    from shg_bookings where event_id = v_event_id and status = 'approved';

  if v_approved + v_guests > v_capacity then
    raise exception 'Not enough capacity remaining';
  end if;

  update shg_bookings
    set status = 'approved', reviewed_by = p_admin_id, reviewed_at = now(), updated_at = now()
    where id = p_booking_id
    returning * into v_booking;

  return v_booking;
end;
$$;

create or replace function shg_reject_booking(p_booking_id uuid, p_admin_id uuid, p_note text default null)
returns shg_bookings language plpgsql as $$
declare v_booking shg_bookings;
begin
  update shg_bookings
    set status = 'rejected', admin_note = p_note, reviewed_by = p_admin_id, reviewed_at = now(), updated_at = now()
    where id = p_booking_id and status = 'pending'
    returning * into v_booking;
  if v_booking.id is null then
    raise exception 'Booking not found or not pending';
  end if;
  return v_booking;
end;
$$;

create or replace function shg_cancel_booking(p_booking_id uuid, p_admin_id uuid)
returns shg_bookings language plpgsql as $$
declare v_booking shg_bookings;
begin
  update shg_bookings
    set status = 'cancelled', reviewed_by = p_admin_id, reviewed_at = now(), updated_at = now()
    where id = p_booking_id and status = 'approved'
    returning * into v_booking;
  if v_booking.id is null then
    raise exception 'Booking not found or not approved';
  end if;
  return v_booking;
end;
$$;

-- ─── RLS — enabled everywhere, narrow public-read only where genuinely public ──

alter table shg_users             enable row level security;
alter table shg_admin_users       enable row level security;
alter table shg_magic_link_tokens enable row level security;
alter table shg_settings          enable row level security;
alter table shg_venues            enable row level security;
alter table shg_games             enable row level security;
alter table shg_events            enable row level security;
alter table shg_event_games       enable row level security;
alter table shg_bookings          enable row level security;

drop policy if exists "Games are publicly readable" on shg_games;
create policy "Games are publicly readable"
  on shg_games for select using (true);

drop policy if exists "Published events are publicly readable" on shg_events;
create policy "Published events are publicly readable"
  on shg_events for select using (status = 'published');

drop policy if exists "Event-game links are publicly readable" on shg_event_games;
create policy "Event-game links are publicly readable"
  on shg_event_games for select using (true);

-- Every other table (shg_venues, shg_bookings, shg_users, shg_admin_users,
-- shg_magic_link_tokens, shg_settings) gets NO policies at all — reads/writes
-- go exclusively through SHG's own API routes using the scoped backend role
-- (see 002_shg_scoped_role.sql), hand-filtered with .eq().
