-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — event booking discount coupons
-- ═══════════════════════════════════════════════════════════════════════════
-- Single-use discount codes (e.g. "GAME15-DBZC6R") applied at booking time.
-- Not scoped to a specific event — any published event's booking form can
-- redeem any unused coupon. RLS follows the shg_tags/shg_venues pattern: no
-- public policy, only the service role (every API route, admin or public,
-- runs server-side with that role) can read/write this table.

create table if not exists shg_coupons (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null,
  discount_percent   int  not null check (discount_percent > 0 and discount_percent <= 100),
  used               boolean not null default false,
  used_by_booking_id uuid references shg_bookings(id) on delete set null,
  used_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Codes are matched case-insensitively (POST /api/coupons/validate and the
-- booking endpoint both use ilike), so the uniqueness constraint has to be
-- case-insensitive too, or "GAME15-DBZC6R" and "game15-dbzc6r" could both
-- get inserted as "different" codes.
create unique index if not exists shg_coupons_code_upper_idx on shg_coupons (upper(code));

alter table shg_coupons enable row level security;
grant select, insert, update, delete on shg_coupons to shg_service;

create or replace trigger trg_shg_coupons_updated_at
  before update on shg_coupons for each row execute function shg_set_updated_at();

-- Snapshot on the booking itself — cost already stores the final (possibly
-- discounted) amount charged; these two columns record *why*, for the
-- admin bookings view.
alter table shg_bookings
  add column if not exists coupon_code      text,
  add column if not exists discount_percent int;
