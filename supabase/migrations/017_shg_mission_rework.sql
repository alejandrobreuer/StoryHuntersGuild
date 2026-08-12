-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — mission system rework
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 016_shg_event_lifecycle.sql.
--
-- Renames quest types (party -> group, community -> guild) and reshapes the
-- mission model to match the full spec:
--   - Group missions get real party formation (shg_quest_groups /
--     shg_quest_group_members) instead of `type = 'group'` being just a label.
--   - Event missions get a per-(quest,event) achieved/failed state driven by
--     a `required_turn_ins` threshold.
--   - shg_quest_activations gains a `rejected` status (admin can deny a
--     turn-in, freeing the player to retry) and a nullable event_id, since
--     Guild missions are no longer tied to any event.
--   - shg_quest_rewards moves off its (quest_id, user_id) primary key to a
--     surrogate id, guarded by a trigger that still blocks a second reward
--     per (quest, user) for every type except 'guild' — Guild missions are
--     the one type that's meant to be repeatable.
--   - shg_quest_history is a new append-only log of every completed/failed
--     outcome, across all mission types, for reporting.

-- ─── 1. Rename quest types ──────────────────────────────────────────────────

alter table shg_quests drop constraint if exists shg_quests_type_check;

update shg_quests set type = 'group' where type = 'party';
update shg_quests set type = 'guild' where type = 'community';

alter table shg_quests
  add constraint shg_quests_type_check check (type in ('individual', 'group', 'event', 'guild'));

-- ─── 2. New per-type config columns on shg_quests ──────────────────────────

alter table shg_quests
  add column if not exists max_participants  int,  -- Group missions: max members per party instance
  add column if not exists required_turn_ins int;  -- Event missions: turn-ins needed to achieve & close

alter table shg_quests drop constraint if exists shg_quests_group_participants_check;
alter table shg_quests
  add constraint shg_quests_group_participants_check
    check (type <> 'group' or max_participants >= 2);

alter table shg_quests drop constraint if exists shg_quests_event_turnins_check;
alter table shg_quests
  add constraint shg_quests_event_turnins_check
    check (type <> 'event' or required_turn_ins >= 1);

-- Guild missions run for a defined window and need a goal, same rule as the
-- old community-quest requirement, just renamed.
alter table shg_quests drop constraint if exists shg_quests_community_goal_check;
alter table shg_quests
  add constraint shg_quests_guild_goal_check
    check (type <> 'guild' or (goal_count is not null and goal_count > 0 and starts_at is not null and ends_at is not null));

comment on column shg_quests.goal_count is 'Guild missions only: target total approved turn-ins for the shared progress bar.';

-- ─── 3. Per-(quest,event) achievement state, for Event missions ───────────

alter table shg_quest_events
  add column if not exists status    text not null default 'open' check (status in ('open', 'achieved', 'failed')),
  add column if not exists closed_at timestamptz;

-- ─── 4. shg_quest_activations: nullable event_id (Guild has none), surrogate

alter table shg_quest_activations
  add column if not exists id uuid not null default gen_random_uuid();

alter table shg_quest_activations drop constraint if exists shg_quest_activations_pkey;
alter table shg_quest_activations add primary key (id);

alter table shg_quest_activations alter column event_id drop not null;

alter table shg_quest_activations drop constraint if exists shg_quest_activations_status_check;
alter table shg_quest_activations
  add constraint shg_quest_activations_status_check check (status in ('active', 'turned_in', 'rejected'));

-- One row per (quest, event, user) for the event-scoped types (individual/event).
-- A plain (non-partial) unique constraint, not a partial index: Postgres never
-- treats two NULLs as equal, so Guild rows (event_id null) never collide here
-- regardless of how many a user accumulates — and it keeps this usable as a
-- plain PostgREST upsert onConflict target, same as before the rework.
alter table shg_quest_activations drop constraint if exists shg_quest_activations_quest_event_user_key;
alter table shg_quest_activations
  add constraint shg_quest_activations_quest_event_user_key unique (quest_id, event_id, user_id);

-- At most one *pending* Guild submission per (quest, user) at a time —
-- rejected rows don't count, so a fresh submission is always possible.
create unique index if not exists shg_quest_activations_guild_pending_idx
  on shg_quest_activations (quest_id, user_id)
  where event_id is null and status = 'turned_in';

create index if not exists shg_quest_activations_quest_idx on shg_quest_activations (quest_id, status);

-- ─── 5. Group mission instances ────────────────────────────────────────────

create table if not exists shg_quest_groups (
  id           uuid primary key default gen_random_uuid(),
  quest_id     uuid not null references shg_quests(id) on delete cascade,
  event_id     uuid not null references shg_events(id) on delete cascade,
  status       text not null default 'forming' check (status in ('forming', 'started', 'turned_in', 'completed', 'rejected')),
  started_at   timestamptz,
  turned_in_at timestamptz,
  turned_in_by uuid references shg_users(id) on delete set null,
  closed_at    timestamptz,
  closed_by    uuid references shg_admin_users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists shg_quest_groups_quest_event_idx on shg_quest_groups (quest_id, event_id, status);
alter table shg_quest_groups enable row level security;
grant select, insert, update, delete on shg_quest_groups to shg_service;

create table if not exists shg_quest_group_members (
  group_id  uuid not null references shg_quest_groups(id) on delete cascade,
  user_id   uuid not null references shg_users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists shg_quest_group_members_user_idx on shg_quest_group_members (user_id);
alter table shg_quest_group_members enable row level security;
grant select, insert, update, delete on shg_quest_group_members to shg_service;

-- ─── 6. shg_quest_rewards: surrogate PK + repeat-guard trigger ────────────

alter table shg_quest_rewards
  add column if not exists id uuid not null default gen_random_uuid();

alter table shg_quest_rewards drop constraint if exists shg_quest_rewards_pkey;
alter table shg_quest_rewards add primary key (id);

alter table shg_quest_rewards
  add column if not exists completion_id uuid references shg_quest_completions(id) on delete set null,
  add column if not exists group_id      uuid references shg_quest_groups(id) on delete set null;

create index if not exists shg_quest_rewards_quest_user_idx on shg_quest_rewards (quest_id, user_id);

-- Individual/Group/Event missions still only ever reward a user once per
-- quest; Guild missions are explicitly repeatable, so they're exempt.
create or replace function shg_quest_rewards_guard() returns trigger language plpgsql as $$
declare
  v_type text;
begin
  select type into v_type from shg_quests where id = new.quest_id;
  if v_type is distinct from 'guild' then
    if exists (select 1 from shg_quest_rewards where quest_id = new.quest_id and user_id = new.user_id) then
      raise exception 'shg_quest_rewards: quest % already rewarded for user %', new.quest_id, new.user_id
        using errcode = '23505';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists shg_quest_rewards_guard_trg on shg_quest_rewards;
create trigger shg_quest_rewards_guard_trg
  before insert on shg_quest_rewards
  for each row execute function shg_quest_rewards_guard();

-- ─── 7. Mission history log ─────────────────────────────────────────────────

create table if not exists shg_quest_history (
  id                 uuid primary key default gen_random_uuid(),
  quest_id           uuid references shg_quests(id) on delete set null,
  quest_title        text not null,
  quest_type         text not null,
  event_id           uuid references shg_events(id) on delete set null,
  event_title        text,
  user_id            uuid references shg_users(id) on delete set null,
  user_label         text not null,
  outcome            text not null check (outcome in ('completed', 'failed')),
  group_id           uuid references shg_quest_groups(id) on delete set null,
  other_participants text[],
  awarded_xp         int not null default 0,
  awarded_rp         int not null default 0,
  recorded_at        timestamptz not null default now()
);
create index if not exists shg_quest_history_quest_idx on shg_quest_history (quest_id);
create index if not exists shg_quest_history_user_idx  on shg_quest_history (user_id);
create index if not exists shg_quest_history_event_idx on shg_quest_history (event_id);
alter table shg_quest_history enable row level security;
grant select, insert, update, delete on shg_quest_history to shg_service;
