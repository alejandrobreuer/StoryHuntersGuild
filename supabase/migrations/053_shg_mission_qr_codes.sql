-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — mission & check-in QR codes
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 052_shg_finance_responsible.sql. See
-- "Reference/Mission & Check-in QR Codes — Spec.md".
--
-- 1. shg_event_mission_codes: one QR token per (event, mission) link. The
--    printed card holds /m/{token}; scanning it drops a pending turn-in into
--    the existing approval queue (or, for Group missions, adds the player to
--    a QR party the host later closes and confirms). Regenerating replaces
--    the token on the same row, so the old printed QR dies immediately.
-- 2. shg_event_attendance: one row per (event, user), written by the
--    entrance check-in QR (/checkin/{token}) or implicitly by a mission claim.
-- 3. shg_events gets its own check-in token.
-- 4. shg_quest_activations / shg_quest_groups get a `source` so the approval
--    queue can label QR submissions. Duplicate scans are already prevented by
--    the existing unique (quest_id, event_id, user_id) on activations — a
--    rejected row is reused (flipped back to turned_in), never duplicated.
-- 5. Window/template settings + a private bucket for the card template.
--
-- Tokens are generated in the app (lib/qr/tokens.ts), not here: codes are
-- created lazily when a mission is attached or the admin QR tab is opened,
-- which also backfills every event that existed before this migration.
--
-- RLS enabled with zero public policies, grants only to shg_service — same
-- pattern as every other shg_ table.

-- ─── 1. Mission codes ───────────────────────────────────────────────────────

create table if not exists shg_event_mission_codes (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references shg_events(id) on delete cascade,
  quest_id    uuid not null references shg_quests(id) on delete cascade,
  token       text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  rotated_at  timestamptz,
  unique (event_id, quest_id)
);
alter table shg_event_mission_codes enable row level security;
grant select, insert, update, delete on shg_event_mission_codes to shg_service;

-- ─── 2. Attendance ──────────────────────────────────────────────────────────

create table if not exists shg_event_attendance (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references shg_events(id) on delete cascade,
  user_id        uuid not null references shg_users(id) on delete cascade,
  booking_id     uuid references shg_bookings(id) on delete set null,
  checked_in_at  timestamptz not null default now(),
  source         text not null check (source in ('qr_checkin', 'mission_claim', 'admin')),
  unique (event_id, user_id)
);
create index if not exists shg_event_attendance_event_idx on shg_event_attendance (event_id, checked_in_at desc);
alter table shg_event_attendance enable row level security;
grant select, insert, update, delete on shg_event_attendance to shg_service;

-- ─── 3. Event check-in token ────────────────────────────────────────────────

alter table shg_events
  add column if not exists checkin_token  text unique,
  add column if not exists checkin_active boolean not null default true;

-- ─── 4. Submission source ───────────────────────────────────────────────────

alter table shg_quest_activations
  add column if not exists source text not null default 'manual' check (source in ('manual', 'qr'));

alter table shg_quest_groups
  add column if not exists source text not null default 'manual' check (source in ('manual', 'qr'));

create index if not exists shg_quest_activations_event_source_idx
  on shg_quest_activations (event_id, turned_in_at desc) where source = 'qr';

-- ─── 5. Settings + template bucket ──────────────────────────────────────────

insert into shg_settings (key, value) values
  ('qr_claims_open_before_minutes',  '0'),
  ('qr_claims_close_after_minutes',  '60'),
  ('qr_checkin_open_before_minutes', '60')
on conflict (key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shg-templates', 'shg-templates', false, 10485760,
  array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;
