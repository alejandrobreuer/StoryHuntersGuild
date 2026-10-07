-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — link admin accounts to an existing user account
-- ═══════════════════════════════════════════════════════════════════════════
-- Admins and public users have always been fully separate identities
-- (shg_admin_users vs shg_users, see 001_shg_init.sql) with independent
-- passwords, even for the same person/email. New admins are now granted to
-- an existing shg_users account instead of typing a brand-new password —
-- shg_admin_users.user_id links the two, and from then on that one
-- shg_users.password_hash is what's checked at /admin/login (see the
-- updated app/api/auth/admin-sign-in/route.ts) — permanently, not just a
-- one-time copy, so changing the password anywhere changes it everywhere.
--
-- Nullable and `on delete set null`, matching every other FK to an identity
-- table in this schema: existing admin accounts (created before this
-- migration) keep user_id null and keep authenticating against their own
-- shg_admin_users.password_hash exactly as before — this migration changes
-- nothing about how they log in.

alter table shg_admin_users
  add column if not exists user_id uuid references shg_users(id) on delete set null;

-- At most one admin account per user — partial index so multiple NULLs
-- (every admin-only account that predates this feature) stay allowed.
create unique index if not exists shg_admin_users_user_id_uniq
  on shg_admin_users (user_id) where user_id is not null;
