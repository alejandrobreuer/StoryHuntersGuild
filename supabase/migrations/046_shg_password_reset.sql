-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — self-service password reset via emailed link
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 045_shg_admin_user_link.sql. Until now a forgotten password
-- could only be reset by staff from /admin/users. This adds one-time reset
-- tokens for shg_users: /api/auth/forgot-password emails a link carrying a
-- random token, /api/auth/reset-password consumes it.
--
-- Only the SHA-256 of the token is stored — the raw token exists solely in
-- the email — so a read of this table can't be replayed as a reset link.
-- Tokens are single-use (used_at) and short-lived (expires_at, 1h, set by
-- the app). Admin accounts linked to a user (045) share that user's
-- password, so resetting it here resets their /admin/login password too.
--
-- RLS enabled with zero public policies, grants only to shg_service — same
-- pattern as every other shg_ table.

create table if not exists shg_password_reset_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references shg_users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists shg_password_reset_tokens_user_idx
  on shg_password_reset_tokens (user_id, created_at desc);

alter table shg_password_reset_tokens enable row level security;
grant select, insert, update, delete on shg_password_reset_tokens to shg_service;
