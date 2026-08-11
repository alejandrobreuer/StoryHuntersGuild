-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — password-only auth, magic links removed
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 013_shg_security_roles.sql. Public users already had an optional
-- password (010_shg_users_password.sql) alongside magic links; this makes
-- password the ONLY sign-in method for both public users and admins, and
-- drops the now-unused magic-link token table.
--
-- IMPORTANT — existing admin accounts have no password yet after this runs
-- (they were magic-link-only). You must set one manually before you can log
-- into /admin again:
--   1. Run `node scripts/hash-password.mjs "your-new-password"` locally.
--   2. Paste the printed hash into:
--        update shg_admin_users set password_hash = '<paste-hash>' where email = 'you@example.com';
--
-- Any existing public shg_users row with password_hash still null (an
-- account that only ever used the old magic-link sign-in) can no longer log
-- itself in either — a staff member can set one for them from /admin/users
-- ("Restablecer contraseña"), same trust model as every other admin-side
-- correction in this app.

alter table shg_admin_users
  add column if not exists password_hash        text,
  add column if not exists failed_login_attempts int not null default 0,
  add column if not exists locked_until          timestamptz;

drop table if exists shg_magic_link_tokens;
