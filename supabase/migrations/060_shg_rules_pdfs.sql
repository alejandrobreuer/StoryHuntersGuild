-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — private bucket for full rulebook PDFs
-- ═══════════════════════════════════════════════════════════════════════════
-- Rulebooks used to live only as static files in public/rules/{game_id}.pdf,
-- so adding one meant a code deploy. This bucket lets staff upload them from
-- Admin → Juegos. Objects are stored as {game_id}.pdf; the app still falls
-- back to public/rules/ for games that haven't been re-uploaded here.
--
-- Private (staff-only reference material, viewed through short-lived signed
-- URLs). 50 MB cap — rulebooks commonly run 5-20 MB, and 50 MB is the
-- default per-file ceiling on Supabase's free plan.
--
-- shg_service already has select/insert/update/delete on storage.objects
-- (003_shg_storage.sql), so no extra grants are needed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shg-rules', 'shg-rules', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;
