-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: mission leader election (Phase 3 of the mission flow)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 028_shg_rol_quest_applications.sql. Once a mission starts, each
-- participant votes for who leads it. The vote resolves automatically the
-- moment every participant has voted (see app/api/rol/quests/[id]/leader-vote/
-- route.ts) — plurality wins; a tie is left unresolved for the DM to break by
-- hand via leader_character_id, same manual-override pattern as everything
-- else in this app (unlocked, hidden, etc.).

alter table shg_rol_quest add column if not exists leader_character_id uuid references shg_rol_character(id) on delete set null;

create table if not exists shg_rol_quest_leader_vote (
  quest_id                uuid not null references shg_rol_quest(id) on delete cascade,
  voter_character_id      uuid not null references shg_rol_character(id) on delete cascade,
  candidate_character_id  uuid not null references shg_rol_character(id) on delete cascade,
  voted_at                timestamptz not null default now(),
  primary key (quest_id, voter_character_id)
);
create index if not exists shg_rol_quest_leader_vote_quest_idx on shg_rol_quest_leader_vote (quest_id);

grant select, insert, update, delete on shg_rol_quest_leader_vote to shg_service;
alter table shg_rol_quest_leader_vote enable row level security;
