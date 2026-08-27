-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: quest notes become single documents
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 032_shg_rol_character_images.sql. Each note thread (the public
-- one, the DM's private one, and each participating character's private one)
-- used to be an append-only list of short messages. It's now exactly one
-- editable document per thread, saved in place — app/api/*/quests/[id]/notes
-- routes do an explicit select-then-update-or-insert (not DB-level upsert;
-- see route comments), so this migration collapses any existing multi-
-- message thread down to just its latest entry — everything older is
-- discarded. Real data may have real message history in it; this is a one-
-- way trim, not something worth trying to preserve as a merged document.

alter table shg_rol_quest_note add column if not exists updated_at timestamptz not null default now();

delete from shg_rol_quest_note a using shg_rol_quest_note b
  where a.visibility = 'public' and b.visibility = 'public'
    and a.quest_id = b.quest_id and a.id <> b.id
    and (a.created_at, a.id) < (b.created_at, b.id);

delete from shg_rol_quest_note a using shg_rol_quest_note b
  where a.visibility = 'dm_private' and b.visibility = 'dm_private'
    and a.quest_id = b.quest_id and a.id <> b.id
    and (a.created_at, a.id) < (b.created_at, b.id);

delete from shg_rol_quest_note a using shg_rol_quest_note b
  where a.visibility = 'player_private' and b.visibility = 'player_private'
    and a.quest_id = b.quest_id and a.character_id = b.character_id and a.id <> b.id
    and (a.created_at, a.id) < (b.created_at, b.id);
