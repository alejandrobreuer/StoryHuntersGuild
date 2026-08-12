-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — event lifecycle (Start/End) + self-service missions
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 015_shg_quest_events.sql.
--
-- started_at/ended_at are distinct from the existing starts_at/ends_at
-- (which are the *scheduled* times shown on the event page) — these two are
-- set by an admin clicking Start/End on the day of, and drive: closing
-- registration, highlighting the event as live on /events, and unlocking
-- the self-service mission grid on the event page.

alter table shg_events
  add column if not exists started_at timestamptz,
  add column if not exists ended_at   timestamptz;

-- A player's own declared progress on a mission at a specific event —
-- "active" (activated it, working on it) or "turned_in" (says they're
-- done, waiting on a Guild Attendant to confirm via the existing admin
-- complete flow, which is what actually grants XP/RP). Not used for
-- community quests, which track progress via shg_quest_completions only.
create table if not exists shg_quest_activations (
  quest_id     uuid not null references shg_quests(id) on delete cascade,
  event_id     uuid not null references shg_events(id) on delete cascade,
  user_id      uuid not null references shg_users(id) on delete cascade,
  status       text not null default 'active' check (status in ('active', 'turned_in')),
  activated_at timestamptz not null default now(),
  turned_in_at timestamptz,
  primary key (quest_id, event_id, user_id)
);
alter table shg_quest_activations enable row level security;
grant select, insert, update, delete on shg_quest_activations to shg_service;
