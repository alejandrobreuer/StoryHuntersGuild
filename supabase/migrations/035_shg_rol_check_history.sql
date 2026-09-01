-- Per-character, per-quest log of dice Checks rolled from the character
-- sheet (attribute rolls, weapon attacks, spell Magic Checks) — feeds the
-- "Historial de tiradas" section of the sheet's notes drawer. Write-only
-- from the player's own client (POST resolves quest_id/character_id
-- server-side from the session, same pattern as shg_rol_quest_note), read
-- back scoped to (quest_id, character_id).

create table if not exists shg_rol_check_history (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references shg_rol_quest(id) on delete cascade,
  character_id uuid not null references shg_rol_character(id) on delete cascade,
  label text not null,
  result text not null,
  created_at timestamptz not null default now()
);

create index if not exists shg_rol_check_history_lookup_idx
  on shg_rol_check_history (quest_id, character_id, created_at desc);

grant select, insert, update, delete on shg_rol_check_history to shg_service;

-- RLS — enabled, no policies (see 019_shg_rol_init.sql header comment):
-- all access goes through the Next.js API layer's admin client.
alter table shg_rol_check_history enable row level security;
