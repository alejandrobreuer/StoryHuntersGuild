-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — merge two player accounts into one
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 056_shg_event_attendance_rp.sql (it uses its rp_awarded column).
--
-- Some players ended up with two accounts (two emails). Admin › Usuarios can
-- merge them: everything from the account being removed ("drop") moves to the
-- one being kept ("keep"), then "drop" is deleted. One transaction: it either
-- all happens or none of it does.
--
-- Duplicates — the same thing earned on both accounts — are kept once, and
-- the XP/RP the extra copy granted is taken off the merged total:
--   * a non-Guild quest rewarded on both          → keep's reward stays
--     (Guild quests are repeatable: every reward moves over)
--   * the same event attended on both             → keep's participation stays;
--     drop's RP for that event is taken back (its booking itself still moves —
--     it's a real payment)
--   * the same badge, mission activation (quest + event) or group membership
--     → one copy stays
-- Everything else moves as is: bookings, quest completions and history,
-- characters (RPG), XP/RP from manual adjustments.
--
-- Account fields: keep's email and password stay (drop's password only if keep
-- has none); empty name/phone are filled from drop; subscriber if either was;
-- the earliest sign-up / subscriber date and the latest login are kept.
--
-- If a later migration adds another table pointing at shg_users, the function
-- refuses to run until it's taught about it, instead of silently losing data.

-- ─── Log of merges ───────────────────────────────────────────────────────────

create table if not exists shg_user_merges (
  id            uuid primary key default gen_random_uuid(),
  kept_user_id  uuid references shg_users(id) on delete set null,
  dropped_email text not null,
  dropped_name  text,
  summary       jsonb not null default '{}'::jsonb,
  merged_by     uuid references shg_admin_users(id) on delete set null,
  merged_at     timestamptz not null default now()
);
create index if not exists shg_user_merges_kept_idx on shg_user_merges (kept_user_id);
alter table shg_user_merges enable row level security;
grant select, insert, update, delete on shg_user_merges to shg_service;

-- ─── The merge ──────────────────────────────────────────────────────────────

create or replace function shg_merge_users(p_keep uuid, p_drop uuid, p_admin uuid)
returns jsonb language plpgsql as $$
declare
  v_keep    shg_users;
  v_drop    shg_users;
  v_unknown text;
  v_dup_xp  int := 0;
  v_dup_rp  int := 0;
  v_n       int;
  v_summary jsonb := '{}'::jsonb;
  v_dup_quests uuid[];
  v_dup_events uuid[];
  v_status_rank constant text[] := array['rejected', 'active', 'turned_in', 'confirmed'];
begin
  if p_keep is null or p_drop is null or p_keep = p_drop then
    raise exception 'Elegí dos cuentas distintas.';
  end if;

  -- Lock both rows (in a fixed order, so two merges can't deadlock).
  perform 1 from shg_users where id in (p_keep, p_drop) order by id for update;
  select * into v_keep from shg_users where id = p_keep;
  select * into v_drop from shg_users where id = p_drop;
  if v_keep.id is null or v_drop.id is null then
    raise exception 'Cuenta no encontrada.';
  end if;

  -- Refuse if something references shg_users that this function doesn't handle.
  select string_agg(c.conrelid::regclass::text || '.' || a.attname, ', ') into v_unknown
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.contype = 'f' and c.confrelid = 'shg_users'::regclass
    and (c.conrelid::regclass::text || '.' || a.attname) not in (
      'shg_bookings.user_id', 'shg_user_badges.user_id', 'shg_quest_completions.user_id',
      'shg_quest_rewards.user_id', 'shg_quest_activations.user_id', 'shg_quest_groups.turned_in_by',
      'shg_quest_group_members.user_id', 'shg_quest_history.user_id', 'shg_rol_character.owner_id',
      'shg_admin_users.user_id', 'shg_password_reset_tokens.user_id', 'shg_event_attendance.user_id',
      'shg_user_merges.kept_user_id');
  if v_unknown is not null then
    raise exception 'La fusión no contempla estas columnas nuevas: %. Hay que actualizar shg_merge_users.', v_unknown;
  end if;

  if exists (select 1 from shg_admin_users where user_id = p_keep)
     and exists (select 1 from shg_admin_users where user_id = p_drop) then
    raise exception 'Las dos cuentas están vinculadas a un administrador: desvinculá una antes de fusionar.';
  end if;

  -- ── Quests: rewards ─────────────────────────────────────────────────────
  -- Non-Guild quests rewarded on both accounts: drop's copy is the duplicate.
  select coalesce(array_agg(distinct r.quest_id), '{}') into v_dup_quests
  from shg_quest_rewards r
  join shg_quests q on q.id = r.quest_id
  where r.user_id = p_drop and q.type <> 'guild'
    and exists (select 1 from shg_quest_rewards k where k.user_id = p_keep and k.quest_id = r.quest_id);

  select coalesce(sum(awarded_xp), 0), coalesce(sum(awarded_rp), 0) into v_dup_xp, v_dup_rp
  from shg_quest_rewards where user_id = p_drop and quest_id = any (v_dup_quests);
  delete from shg_quest_rewards where user_id = p_drop and quest_id = any (v_dup_quests);
  get diagnostics v_n = row_count;
  v_summary := v_summary || jsonb_build_object('duplicate_quests', v_n);

  update shg_quest_rewards set user_id = p_keep where user_id = p_drop;
  get diagnostics v_n = row_count;
  v_summary := v_summary || jsonb_build_object('quests_moved', v_n);

  -- Their completions and "completed" history entries go with them.
  delete from shg_quest_completions where user_id = p_drop and quest_id = any (v_dup_quests);
  update shg_quest_completions set user_id = p_keep where user_id = p_drop;
  delete from shg_quest_history
   where user_id = p_drop and outcome = 'completed' and quest_id = any (v_dup_quests);
  update shg_quest_history set user_id = p_keep where user_id = p_drop;

  -- ── Quests: activations (one per quest + event; best status wins) ───────
  update shg_quest_activations k
     set status = d.status, turned_in_at = coalesce(d.turned_in_at, k.turned_in_at)
    from shg_quest_activations d
   where k.user_id = p_keep and d.user_id = p_drop
     and k.quest_id = d.quest_id and k.event_id = d.event_id
     and array_position(v_status_rank, d.status) > array_position(v_status_rank, k.status);
  delete from shg_quest_activations d
   using shg_quest_activations k
   where d.user_id = p_drop and k.user_id = p_keep
     and k.quest_id = d.quest_id and k.event_id = d.event_id;
  -- Guild submissions (no event): at most one pending per quest.
  delete from shg_quest_activations d
   where d.user_id = p_drop and d.event_id is null and d.status = 'turned_in'
     and exists (select 1 from shg_quest_activations k
                  where k.user_id = p_keep and k.quest_id = d.quest_id
                    and k.event_id is null and k.status = 'turned_in');
  update shg_quest_activations set user_id = p_keep where user_id = p_drop;

  -- ── Quests: groups ──────────────────────────────────────────────────────
  delete from shg_quest_group_members d
   where d.user_id = p_drop
     and exists (select 1 from shg_quest_group_members k where k.user_id = p_keep and k.group_id = d.group_id);
  update shg_quest_group_members set user_id = p_keep where user_id = p_drop;
  update shg_quest_groups set turned_in_by = p_keep where turned_in_by = p_drop;

  -- ── Badges ──────────────────────────────────────────────────────────────
  update shg_user_badges k set awarded_at = least(k.awarded_at, d.awarded_at)
    from shg_user_badges d
   where k.user_id = p_keep and d.user_id = p_drop and k.badge_id = d.badge_id;
  delete from shg_user_badges d
   using shg_user_badges k
   where d.user_id = p_drop and k.user_id = p_keep and k.badge_id = d.badge_id;
  update shg_user_badges set user_id = p_keep where user_id = p_drop;
  get diagnostics v_n = row_count;
  v_summary := v_summary || jsonb_build_object('badges_moved', v_n);

  -- ── Events ──────────────────────────────────────────────────────────────
  -- Events keep already took part in (check-in, or attendance ticked on one
  -- of its bookings): drop's participation there is the duplicate.
  select coalesce(array_agg(distinct e), '{}') into v_dup_events from (
    select event_id as e from shg_event_attendance where user_id = p_keep
    union
    select event_id from shg_bookings where user_id = p_keep and attended
  ) kept
  where e in (
    select event_id from shg_event_attendance where user_id = p_drop
    union
    select event_id from shg_bookings where user_id = p_drop and attended
  );
  v_summary := v_summary || jsonb_build_object('duplicate_events', coalesce(array_length(v_dup_events, 1), 0));

  -- Take back drop's RP for those events, then drop its attendance row there.
  v_dup_rp := v_dup_rp
    + coalesce((select sum(rp_awarded) from shg_event_attendance where user_id = p_drop and event_id = any (v_dup_events)), 0)
    + coalesce((select sum(rp_awarded) from shg_bookings where user_id = p_drop and event_id = any (v_dup_events)), 0);
  update shg_bookings set rp_awarded = 0, attended = false
   where user_id = p_drop and event_id = any (v_dup_events);
  delete from shg_event_attendance where user_id = p_drop and event_id = any (v_dup_events);

  update shg_event_attendance set user_id = p_keep where user_id = p_drop;
  get diagnostics v_n = row_count;
  v_summary := v_summary || jsonb_build_object('events_moved', v_n);

  update shg_bookings set user_id = p_keep where user_id = p_drop;
  get diagnostics v_n = row_count;
  v_summary := v_summary || jsonb_build_object('bookings_moved', v_n);

  -- ── Everything else ─────────────────────────────────────────────────────
  update shg_rol_character set owner_id = p_keep where owner_id = p_drop;
  get diagnostics v_n = row_count;
  v_summary := v_summary || jsonb_build_object('characters_moved', v_n);

  update shg_admin_users set user_id = p_keep where user_id = p_drop;
  delete from shg_password_reset_tokens where user_id = p_drop;

  -- ── The account itself ──────────────────────────────────────────────────
  delete from shg_users where id = p_drop;

  update shg_users set
    xp               = v_keep.xp + v_drop.xp - v_dup_xp,
    rp               = v_keep.rp + v_drop.rp - v_dup_rp,
    name             = coalesce(nullif(trim(v_keep.name), ''), v_drop.name),
    phone            = coalesce(nullif(trim(v_keep.phone), ''), v_drop.phone),
    password_hash    = coalesce(v_keep.password_hash, v_drop.password_hash),
    is_subscriber    = v_keep.is_subscriber or v_drop.is_subscriber,
    subscriber_since = case
                         when v_keep.subscriber_since is null then v_drop.subscriber_since
                         when v_drop.subscriber_since is null then v_keep.subscriber_since
                         else least(v_keep.subscriber_since, v_drop.subscriber_since) end,
    created_at       = least(v_keep.created_at, v_drop.created_at),
    last_login_at    = greatest(v_keep.last_login_at, v_drop.last_login_at)
  where id = p_keep;

  v_summary := v_summary || jsonb_build_object(
    'xp_from_drop', v_drop.xp - v_dup_xp, 'rp_from_drop', v_drop.rp - v_dup_rp,
    'duplicate_xp', v_dup_xp, 'duplicate_rp', v_dup_rp);

  insert into shg_user_merges (kept_user_id, dropped_email, dropped_name, summary, merged_by)
  values (p_keep, v_drop.email, v_drop.name, v_summary, p_admin);

  return v_summary;
end;
$$;

grant execute on function shg_merge_users(uuid, uuid, uuid) to shg_service;
