-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: turn-in → accept → allocate → finish (Phase 4)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 029_shg_rol_quest_leader_vote.sql. Replaces the old one-step
-- "complete" action with the real flow: the mission's elected LEADER turns
-- it in, the DM accepts (which is when reward_standing lands on every
-- participant and reward_supplies becomes a pool the leader can spend), the
-- leader allocates that pool across guild features eligible at the guild's
-- current Guild Status (auto-unlocking a feature once its cost is met), and
-- finally the DM finishes the mission — any supplies the leader never got
-- around to allocating just land in the guild's general pool (no gate on
-- allocation completeness). shg_rol_quest_supply_allocation is the ledger a
-- later phase's history view reads to show "where supplies went."

alter type shg_rol_quest_status add value if not exists 'turned_in' after 'active';
alter type shg_rol_quest_status add value if not exists 'accepted' after 'turned_in';

alter table shg_rol_quest add column if not exists turned_in_at timestamptz;
alter table shg_rol_quest add column if not exists turned_in_by uuid references shg_rol_character(id) on delete set null;
alter table shg_rol_quest add column if not exists accepted_at timestamptz;
alter table shg_rol_quest add column if not exists accepted_by uuid references shg_admin_users(id) on delete set null;
-- Set at Accept from reward_supplies; decremented as the leader allocates;
-- whatever's left when the DM Finishes goes to shg_rol_guild.supplies.
alter table shg_rol_quest add column if not exists supplies_pool_remaining int not null default 0;

create table if not exists shg_rol_quest_supply_allocation (
  id           uuid primary key default gen_random_uuid(),
  quest_id     uuid not null references shg_rol_quest(id) on delete cascade,
  feature_id   uuid not null references shg_rol_guild_feature(id) on delete cascade,
  amount       int not null check (amount > 0),
  allocated_at timestamptz not null default now()
);
create index if not exists shg_rol_quest_supply_allocation_quest_idx on shg_rol_quest_supply_allocation (quest_id);
create index if not exists shg_rol_quest_supply_allocation_feature_idx on shg_rol_quest_supply_allocation (feature_id);

grant select, insert, update, delete on shg_rol_quest_supply_allocation to shg_service;
alter table shg_rol_quest_supply_allocation enable row level security;

-- superseded by shg_rol_accept_quest (reward_standing) + shg_rol_finish_quest
-- (leftover supplies) below — the old one-step complete flow no longer exists.
drop function if exists shg_rol_complete_quest(uuid, uuid);

-- ─── Accept: leader→DM turn-in becomes real rewards ────────────────────────

create or replace function shg_rol_accept_quest(p_quest_id uuid, p_admin_id uuid)
returns shg_rol_quest language plpgsql as $$
declare
  v_quest shg_rol_quest;
  v_guild_id uuid;
  v_participant record;
  v_new_points int;
  v_rank_id uuid;
begin
  select * into v_quest from shg_rol_quest where id = p_quest_id and status = 'turned_in' for update;
  if v_quest.id is null then
    raise exception 'Quest not found or not turned in';
  end if;

  select id into v_guild_id from shg_rol_guild limit 1;

  for v_participant in
    select character_id from shg_rol_quest_participant where quest_id = p_quest_id
  loop
    update shg_rol_character
      set guild_points = guild_points + v_quest.reward_standing
      where id = v_participant.character_id
      returning guild_points into v_new_points;

    select id into v_rank_id
      from shg_rol_guild_rank
      where guild_id = v_guild_id and points_threshold <= v_new_points
      order by points_threshold desc
      limit 1;

    update shg_rol_character set guild_rank_id = v_rank_id where id = v_participant.character_id;
  end loop;

  update shg_rol_quest
    set status = 'accepted', accepted_at = now(), accepted_by = p_admin_id,
        supplies_pool_remaining = v_quest.reward_supplies
    where id = p_quest_id
    returning * into v_quest;

  return v_quest;
end;
$$;

-- ─── Allocate: leader spends the supplies pool on an eligible feature ──────

create or replace function shg_rol_allocate_quest_supplies(p_quest_id uuid, p_feature_id uuid, p_amount int)
returns shg_rol_guild_feature language plpgsql as $$
declare
  v_quest shg_rol_quest;
  v_feature shg_rol_guild_feature;
  v_guild_sort int;
  v_feature_sort int;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_quest from shg_rol_quest where id = p_quest_id and status = 'accepted' for update;
  if v_quest.id is null then
    raise exception 'Quest not found or not accepted';
  end if;
  if p_amount > v_quest.supplies_pool_remaining then
    raise exception 'Amount exceeds the remaining supplies pool';
  end if;

  select * into v_feature from shg_rol_guild_feature where id = p_feature_id for update;
  if v_feature.id is null then
    raise exception 'Feature not found';
  end if;
  if v_feature.unlocked then
    raise exception 'Feature is already unlocked';
  end if;

  if v_feature.guild_status_id is not null then
    select sort_order into v_feature_sort from shg_rol_guild_status where id = v_feature.guild_status_id;
    -- shg_rol_guild is a singleton table — no filter needed beyond the join.
    select gs.sort_order into v_guild_sort
      from shg_rol_guild g
      join shg_rol_guild_status gs on gs.id = g.current_guild_status_id
      limit 1;
    if v_guild_sort is null or v_guild_sort < v_feature_sort then
      raise exception 'Feature is not eligible at the guild''s current status';
    end if;
  end if;

  insert into shg_rol_quest_supply_allocation (quest_id, feature_id, amount)
  values (p_quest_id, p_feature_id, p_amount);

  update shg_rol_quest set supplies_pool_remaining = supplies_pool_remaining - p_amount where id = p_quest_id;

  update shg_rol_guild_feature
    set supplies_allocated = supplies_allocated + p_amount,
        unlocked = (supplies_allocated + p_amount) >= cost_supplies
    where id = p_feature_id
    returning * into v_feature;

  return v_feature;
end;
$$;

-- ─── Finish: leftover pool goes to the guild's general supplies ───────────

create or replace function shg_rol_finish_quest(p_quest_id uuid, p_admin_id uuid)
returns shg_rol_quest language plpgsql as $$
declare
  v_quest shg_rol_quest;
  v_guild_id uuid;
begin
  select * into v_quest from shg_rol_quest where id = p_quest_id and status = 'accepted' for update;
  if v_quest.id is null then
    raise exception 'Quest not found or not accepted';
  end if;

  select id into v_guild_id from shg_rol_guild limit 1;
  update shg_rol_guild set supplies = supplies + v_quest.supplies_pool_remaining where id = v_guild_id;

  update shg_rol_quest
    set status = 'completed', completed_at = now(), completed_by = p_admin_id, supplies_pool_remaining = 0
    where id = p_quest_id
    returning * into v_quest;

  return v_quest;
end;
$$;

grant execute on function shg_rol_accept_quest(uuid, uuid) to shg_service;
grant execute on function shg_rol_allocate_quest_supplies(uuid, uuid, int) to shg_service;
grant execute on function shg_rol_finish_quest(uuid, uuid) to shg_service;
