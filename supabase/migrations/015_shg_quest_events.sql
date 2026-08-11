-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — reusable missions: many-to-many event assignment
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 014_shg_password_auth.sql. Quests used to hard-link to a single
-- event via shg_quests.event_id, so a mission had to be re-created for every
-- event it should appear at. This replaces that with shg_quest_events, so a
-- mission is defined once in the mission panel and then made available at
-- any number of events. Also adds an optional game link (shown as a small
-- thumbnail wherever the mission is displayed), a difficulty label, and a
-- per-event completion cap (0 = unlimited) — enforced by counting
-- shg_quest_completions scoped to that (quest, event) pair, which is why
-- shg_quest_completions gains its own event_id.

create table if not exists shg_quest_events (
  quest_id uuid not null references shg_quests(id) on delete cascade,
  event_id uuid not null references shg_events(id) on delete cascade,
  primary key (quest_id, event_id)
);
alter table shg_quest_events enable row level security;
grant select, insert, update, delete on shg_quest_events to shg_service;

-- Carry forward any existing single event_id link before dropping the column.
insert into shg_quest_events (quest_id, event_id)
select id, event_id from shg_quests where event_id is not null
on conflict do nothing;

alter table shg_quests
  add column if not exists difficulty text not null default 'medium' check (difficulty in ('low', 'medium', 'high')),
  add column if not exists game_id uuid references shg_games(id) on delete set null,
  add column if not exists max_completions_per_event int not null default 0;

alter table shg_quests drop column if exists event_id;

alter table shg_quest_completions
  add column if not exists event_id uuid references shg_events(id) on delete set null;
