-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — storage buckets + shg_service grants on storage schema
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 002_shg_scoped_role.sql. Neither shg-media nor shg-receipts was
-- ever actually created — they were only referenced in application code
-- (app/api/admin/media/route.ts, app/api/bookings/route.ts) and a column
-- comment, which is why uploads to both have been failing.
--
-- shg_service already has bypassrls (from 002), but bypassrls only applies
-- to tables the role has an explicit GRANT on — it was never granted
-- anything on the storage schema, so even with the buckets created, every
-- insert into storage.objects would still fail with permission denied.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shg-media', 'shg-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shg-receipts', 'shg-receipts', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

grant usage on schema storage to shg_service;
grant select on storage.buckets to shg_service;
grant select, insert, update, delete on storage.objects to shg_service;
