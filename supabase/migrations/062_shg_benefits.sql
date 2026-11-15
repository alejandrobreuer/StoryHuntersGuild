-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — benefits unlocked by rank or level
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 061_shg_game_languages.sql.
--
-- Staff define benefits in Configuración → Beneficios. Each one unlocks at a
-- rank (RP) or at a level (XP), and a player keeps every benefit they've
-- unlocked. Kinds:
--
--   custom           free text ("Una remera"); staff mark it delivered
--   event_discount   percent off the player's own ticket, every booking
--                    (only the biggest one applies)
--   monthly_invites  `quantity` codes a month to share with someone who has
--                    never booked; `percent` off that person's ticket
--   monthly_2x1      `quantity` times a month, one ticket of a 2+ booking free
--   free_tickets     `quantity` free tickets, once
--   bonus_rewards    `percent` extra XP and RP from attendance and missions
--                    (only the biggest one applies)
--
-- Which benefits a player has is worked out in the app (lib/benefits.ts)
-- from their rp/xp, so nothing needs updating when they move up. These
-- tables only record what has been used or handed out.
--
-- Also adds shg_events.min_rank_id: an event only that rank and up can book.

-- ─── Benefits ───────────────────────────────────────────────────────────────

create table if not exists shg_benefits (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  kind         text not null check (kind in ('custom', 'event_discount', 'monthly_invites', 'monthly_2x1', 'free_tickets', 'bonus_rewards')),
  unlock_type  text not null check (unlock_type in ('rank', 'level')),
  -- Deleting a rank deletes the benefits it unlocked.
  rank_id      uuid references shg_ranks(id) on delete cascade,
  min_level    int check (min_level >= 1),
  percent      int check (percent between 1 and 100),
  quantity     int check (quantity between 1 and 50),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint shg_benefits_unlock check (
    (unlock_type = 'rank'  and rank_id is not null and min_level is null) or
    (unlock_type = 'level' and min_level is not null and rank_id is null)
  ),
  constraint shg_benefits_kind_fields check (
    case kind
      when 'event_discount'  then percent is not null
      when 'bonus_rewards'   then percent is not null
      when 'monthly_invites' then percent is not null and quantity is not null
      when 'monthly_2x1'     then quantity is not null
      when 'free_tickets'    then quantity is not null
      else true
    end
  )
);

create or replace trigger trg_shg_benefits_updated_at
  before update on shg_benefits for each row execute function shg_set_updated_at();

-- ─── Custom benefits handed out ─────────────────────────────────────────────

create table if not exists shg_benefit_deliveries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references shg_users(id) on delete cascade,
  benefit_id    uuid not null references shg_benefits(id) on delete cascade,
  delivered_by  uuid references shg_admin_users(id) on delete set null,
  delivered_at  timestamptz not null default now(),
  unique (user_id, benefit_id)
);

-- ─── 2x1 and free tickets used ──────────────────────────────────────────────
-- One row per ticket a benefit paid for. `period` (YYYY-MM, Buenos Aires
-- time) is what monthly limits count. Rows go away with their booking, and
-- when it's rejected or cancelled (trigger below), giving the use back.

create table if not exists shg_benefit_uses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references shg_users(id) on delete cascade,
  benefit_id  uuid not null references shg_benefits(id) on delete cascade,
  booking_id  uuid not null references shg_bookings(id) on delete cascade,
  period      text not null,
  created_at  timestamptz not null default now()
);

create index if not exists shg_benefit_uses_lookup_idx on shg_benefit_uses (user_id, benefit_id, period);

-- Claims `p_count` uses of a benefit for a booking, unless that would go
-- past `p_limit` (counted within `p_period` when p_monthly, else all-time).
-- A per-user/benefit advisory lock makes two bookings at once take turns.
create or replace function shg_claim_benefit_uses(
  p_user_id uuid, p_benefit_id uuid, p_booking_id uuid,
  p_period text, p_monthly boolean, p_limit int, p_count int
) returns boolean language plpgsql as $$
declare
  v_used int;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_benefit_id::text));

  select count(*) into v_used from shg_benefit_uses
    where user_id = p_user_id and benefit_id = p_benefit_id
      and (not p_monthly or period = p_period);

  if v_used + p_count > p_limit then
    return false;
  end if;

  insert into shg_benefit_uses (user_id, benefit_id, booking_id, period)
    select p_user_id, p_benefit_id, p_booking_id, p_period from generate_series(1, p_count);
  return true;
end;
$$;

-- ─── Invite codes ───────────────────────────────────────────────────────────
-- Created on demand (the first time the owner opens their profile in a
-- month), each good until the end of the following month. Only someone with
-- no previous booking can use one (checked in the app).

create table if not exists shg_invite_codes (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null,
  owner_id            uuid not null references shg_users(id) on delete cascade,
  benefit_id          uuid not null references shg_benefits(id) on delete cascade,
  period              text not null,
  discount_percent    int  not null check (discount_percent between 1 and 100),
  expires_at          timestamptz not null,
  used_by_user_id     uuid references shg_users(id) on delete set null,
  used_by_booking_id  uuid references shg_bookings(id) on delete set null,
  used_at             timestamptz,
  created_at          timestamptz not null default now()
);

create unique index if not exists shg_invite_codes_code_upper_idx on shg_invite_codes (upper(code));
create index if not exists shg_invite_codes_owner_idx on shg_invite_codes (owner_id, benefit_id, period);

-- ─── Give benefits back when a booking falls through ────────────────────────

create or replace function shg_benefits_release_booking()
returns trigger language plpgsql as $$
begin
  if new.status in ('rejected', 'cancelled') and old.status not in ('rejected', 'cancelled') then
    delete from shg_benefit_uses where booking_id = new.id;
    update shg_invite_codes
      set used_at = null, used_by_user_id = null, used_by_booking_id = null
      where used_by_booking_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists shg_benefits_release_booking on shg_bookings;
create trigger shg_benefits_release_booking
  after update of status on shg_bookings
  for each row execute function shg_benefits_release_booking();

-- ─── Rank-only events ───────────────────────────────────────────────────────

alter table shg_events
  add column if not exists min_rank_id uuid references shg_ranks(id) on delete set null;

-- ─── Access ─────────────────────────────────────────────────────────────────

alter table shg_benefits           enable row level security;
alter table shg_benefit_deliveries enable row level security;
alter table shg_benefit_uses       enable row level security;
alter table shg_invite_codes       enable row level security;

grant select, insert, update, delete on shg_benefits, shg_benefit_deliveries, shg_benefit_uses, shg_invite_codes to shg_service;
grant execute on function shg_claim_benefit_uses(uuid, uuid, uuid, text, boolean, int, int) to shg_service;
