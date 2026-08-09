-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — password-based sign-in for public users
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 009_shg_tags.sql. Adds an optional password alongside the
-- existing passwordless magic-link flow (see shg_magic_link_tokens) — a
-- user can have neither, either, or both. password_hash is nullable:
-- magic-link-only accounts stay valid with no password ever set.
--
-- failed_login_attempts/locked_until implement a simple brute-force
-- lockout for password sign-in specifically — magic link doesn't need
-- this, it's already rate-limited per-email at the token-request level
-- (see lib/auth/magic-link.ts), but a password is a new guessable-secret
-- surface that wasn't rate-limited before.

alter table shg_users
  add column if not exists password_hash        text,
  add column if not exists failed_login_attempts int not null default 0,
  add column if not exists locked_until          timestamptz;
