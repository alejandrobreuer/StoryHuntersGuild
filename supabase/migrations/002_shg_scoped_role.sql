-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — dedicated, GRANT-scoped Postgres role
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 001_shg_init.sql. This is the actual database-level enforcement
-- of the shg_ boundary — NOT cardstash.ar's SUPABASE_SERVICE_ROLE_KEY, which
-- bypasses RLS for the entire Supabase project. A leak of the credential
-- minted from this role (see the JWT-minting step below) can only ever touch
-- shg_-prefixed tables, full stop, regardless of what happens to it.
--
-- BYPASSRLS matters here only WITHIN tables this role already has a GRANT on
-- — it does not grant access to any table it wasn't explicitly given. GRANT
-- is the actual isolation mechanism, and it's independent of and prior to RLS.

create role shg_service nologin bypassrls;
grant shg_service to authenticator;   -- lets PostgREST assume this role for a correctly-signed request
grant usage on schema public to shg_service;

grant select, insert, update, delete on
  shg_users, shg_admin_users, shg_magic_link_tokens, shg_settings,
  shg_venues, shg_games, shg_events, shg_event_games, shg_bookings
  to shg_service;

grant select on shg_event_remaining to shg_service;

grant execute on function shg_approve_booking(uuid, uuid) to shg_service;
grant execute on function shg_reject_booking(uuid, uuid, text) to shg_service;
grant execute on function shg_cancel_booking(uuid, uuid) to shg_service;

-- ─── Minting the credential (manual, one-time, NOT part of the deployed app) ──
--
-- 1. Get the Supabase project's JWT secret: Supabase dashboard → Settings →
--    API → JWT Secret. (This is a project-level secret, distinct from SHG's
--    own SESSION_SECRET/ADMIN_SESSION_SECRET.)
--
-- 2. Sign a long-lived JWT with that secret, payload { "role": "shg_service" },
--    e.g. via a throwaway local script using `jose`:
--
--      import { SignJWT } from "jose";
--      const secret = new TextEncoder().encode("<the JWT secret from step 1>");
--      const token = await new SignJWT({ role: "shg_service" })
--        .setProtectedHeader({ alg: "HS256" })
--        .setIssuedAt()
--        .setExpirationTime("10y")
--        .sign(secret);
--      console.log(token);
--
--    PostgREST reads the `role` claim from any bearer token it receives and
--    assumes that Postgres role for the request — the same mechanism
--    Supabase's own anon/service_role keys already use, just extended to a
--    third, custom-scoped role.
--
-- 3. Store the resulting token string as the SHG_SERVICE_ROLE_JWT env var
--    (Vercel project settings + .env.local for local dev). lib/supabase/admin.ts
--    uses this instead of a service-role key.
--
-- Verification query, after setup:
--   select table_name, privilege_type from information_schema.role_table_grants
--   where grantee = 'shg_service';
-- Should list ONLY shg_-prefixed tables — nothing from cardstash.ar's schema.
