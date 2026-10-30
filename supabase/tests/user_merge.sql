-- ═══════════════════════════════════════════════════════════════════════════
-- Merge two accounts (run after 058_shg_merge_users.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- Safe to run against production: everything runs inside one block that is
-- always rolled back at the end, pass or fail.
--
-- Paste the whole file in the Supabase SQL editor and run it.
--   Passed → the last result says "Fusión de cuentas: todas las pruebas pasaron".
--   Failed → an error naming the test that failed.
--
-- Needs at least one admin and one venue.

create or replace function pg_temp.check(p_ok boolean, p_test text)
returns void language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FALLÓ [%]', p_test;
  end if;
end;
$$;

do $$
declare
  v_admin   uuid;
  v_keep    uuid;
  v_drop    uuid;
  v_event   uuid;
  v_event2  uuid;
  v_q_once  uuid;   -- individual quest, rewarded on both → duplicate
  v_q_only  uuid;   -- individual quest, only on drop → moves
  v_q_guild uuid;   -- guild quest, on both → both rewards kept
  v_badge   uuid;
  v_badge2  uuid;
  v_b_dup   uuid;
  v_b_new   uuid;
  v_s       jsonb;
  v_u       shg_users;
begin
  begin
    select id into v_admin from shg_admin_users order by created_at limit 1;
    perform pg_temp.check(v_admin is not null, 'hay al menos un administrador');

    -- ── Two accounts ────────────────────────────────────────────────────────
    insert into shg_users (email, name, xp, rp, password_hash, created_at)
      values ('keep-' || gen_random_uuid() || '@example.invalid', 'Conservada', 0, 0, null, '2025-06-01')
      returning id into v_keep;
    insert into shg_users (email, name, phone, xp, rp, password_hash, is_subscriber, subscriber_since, created_at)
      values ('drop-' || gen_random_uuid() || '@example.invalid', 'Duplicada', '1155550000', 0, 0, 'salt:hash', true, '2025-02-01', '2025-01-01')
      returning id into v_drop;

    -- ── Events ──────────────────────────────────────────────────────────────
    insert into shg_events (title, slug, venue_id, starts_at, capacity, price_per_person, status, reward_rp)
      select 'Prueba fusión', 'prueba-fusion-' || gen_random_uuid(), id, '1990-05-01', 10, 8000, 'published', 3
      from shg_venues limit 1 returning id into v_event;
    perform pg_temp.check(v_event is not null, 'hay al menos un lugar (venue)');
    insert into shg_events (title, slug, venue_id, starts_at, capacity, price_per_person, status, reward_rp)
      select 'Prueba fusión 2', 'prueba-fusion-2-' || gen_random_uuid(), venue_id, '1990-06-01', 10, 8000, 'published', 3
      from shg_events where id = v_event returning id into v_event2;

    -- ── Quests + badges ─────────────────────────────────────────────────────
    insert into shg_badges (name) values ('Prueba fusión ' || gen_random_uuid()) returning id into v_badge;
    insert into shg_badges (name) values ('Prueba fusión 2 ' || gen_random_uuid()) returning id into v_badge2;
    insert into shg_quests (title, type, status, reward_xp, reward_rp, badge_id)
      values ('Una vez', 'individual', 'active', 10, 1, v_badge) returning id into v_q_once;
    insert into shg_quests (title, type, status, reward_xp, reward_rp, badge_id)
      values ('Sólo en la duplicada', 'individual', 'active', 20, 2, v_badge2) returning id into v_q_only;
    insert into shg_quests (title, type, status, reward_xp, reward_rp, goal_count, starts_at, ends_at)
      values ('Gremio', 'guild', 'active', 5, 0, 10, '1990-01-01', '2100-01-01') returning id into v_q_guild;

    -- keep: "Una vez" + one guild reward + badge 1
    insert into shg_quest_rewards (quest_id, user_id, awarded_xp, awarded_rp) values
      (v_q_once, v_keep, 10, 1), (v_q_guild, v_keep, 5, 0);
    insert into shg_quest_completions (quest_id, user_id) values (v_q_once, v_keep), (v_q_guild, v_keep);
    insert into shg_user_badges (user_id, badge_id, awarded_at) values (v_keep, v_badge, '1990-03-01');
    update shg_users set xp = 15, rp = 1 where id = v_keep;

    -- drop: "Una vez" again (duplicate), "Sólo en la duplicada", a guild reward, both badges,
    -- plus 7 XP from a manual adjustment
    insert into shg_quest_rewards (quest_id, user_id, awarded_xp, awarded_rp) values
      (v_q_once, v_drop, 10, 1), (v_q_only, v_drop, 20, 2), (v_q_guild, v_drop, 5, 0);
    insert into shg_quest_completions (quest_id, user_id) values
      (v_q_once, v_drop), (v_q_only, v_drop), (v_q_guild, v_drop);
    insert into shg_user_badges (user_id, badge_id, awarded_at) values
      (v_drop, v_badge, '1990-02-01'), (v_drop, v_badge2, '1990-02-01');
    update shg_users set xp = 10 + 20 + 5 + 7, rp = 1 + 2 where id = v_drop;

    -- ── Events: both attended event 1 (duplicate), only drop attended event 2 ─
    insert into shg_event_attendance (event_id, user_id, source, rp_awarded) values (v_event, v_keep, 'admin', 3);
    insert into shg_bookings (event_id, user_id, name, email, guest_count, cost, attended, rp_awarded, status)
      values (v_event, v_drop, 'Duplicada', 'x@example.invalid', 1, 8000, true, 3, 'approved') returning id into v_b_dup;
    insert into shg_bookings (event_id, user_id, name, email, guest_count, cost, attended, rp_awarded, status)
      values (v_event2, v_drop, 'Duplicada', 'x@example.invalid', 1, 8000, true, 3, 'approved') returning id into v_b_new;
    update shg_users set rp = rp + 3 where id = v_keep;
    update shg_users set rp = rp + 6 where id = v_drop;

    -- ── Merge ───────────────────────────────────────────────────────────────
    v_s := shg_merge_users(v_keep, v_drop, v_admin);
    select * into v_u from shg_users where id = v_keep;

    perform pg_temp.check(not exists (select 1 from shg_users where id = v_drop), 'la cuenta duplicada se elimina');

    -- XP: keep 15 + drop 42 − duplicate quest 10 = 47
    perform pg_temp.check(v_u.xp = 47, format('XP sumada sin el duplicado (47, quedó %s)', v_u.xp));
    -- RP: keep 1+3 + drop 3+6 − duplicate quest 1 − duplicate event 3 = 9
    perform pg_temp.check(v_u.rp = 9, format('RP sumada sin duplicados (9, quedó %s)', v_u.rp));

    perform pg_temp.check((select count(*) from shg_quest_rewards where user_id = v_keep and quest_id = v_q_once) = 1,
      'misión repetida queda una sola vez');
    perform pg_temp.check((select count(*) from shg_quest_rewards where user_id = v_keep and quest_id = v_q_only) = 1,
      'misión de la duplicada pasa a la conservada');
    perform pg_temp.check((select count(*) from shg_quest_rewards where user_id = v_keep and quest_id = v_q_guild) = 2,
      'misiones de gremio (repetibles) se suman');
    perform pg_temp.check((select count(*) from shg_quest_completions where user_id = v_keep and quest_id = v_q_once) = 1,
      'la entrega duplicada se descarta');

    perform pg_temp.check((select count(*) from shg_user_badges where user_id = v_keep) = 2, 'insignias sin repetir');
    perform pg_temp.check((select awarded_at from shg_user_badges where user_id = v_keep and badge_id = v_badge) = '1990-02-01',
      'insignia repetida conserva la fecha más antigua');

    perform pg_temp.check((select count(*) from shg_bookings where user_id = v_keep and id in (v_b_dup, v_b_new)) = 2,
      'las reservas (pagos) pasan todas');
    perform pg_temp.check((select not attended and rp_awarded = 0 from shg_bookings where id = v_b_dup),
      'evento repetido: la asistencia duplicada no suma RP');
    perform pg_temp.check((select attended and rp_awarded = 3 from shg_bookings where id = v_b_new),
      'evento sólo de la duplicada se conserva con su RP');

    perform pg_temp.check(v_u.name = 'Conservada' and v_u.phone = '1155550000', 'nombre se conserva, teléfono vacío se completa');
    perform pg_temp.check(v_u.password_hash = 'salt:hash', 'sin contraseña propia, toma la de la duplicada');
    perform pg_temp.check(v_u.is_subscriber and v_u.subscriber_since = '2025-02-01', 'suscripción se conserva');
    perform pg_temp.check(v_u.created_at = '2025-01-01', 'fecha de alta = la más antigua');

    perform pg_temp.check(exists (select 1 from shg_user_merges where kept_user_id = v_keep and merged_by = v_admin),
      'queda registro de la fusión');

    -- ── Guards ──────────────────────────────────────────────────────────────
    begin
      perform shg_merge_users(v_keep, v_keep, v_admin);
      raise exception 'FALLÓ [no se puede fusionar una cuenta consigo misma]';
    exception when others then
      if sqlerrm like 'FALLÓ%' then raise; end if;
    end;

    raise exception 'shg_test_rollback';
  exception when others then
    if sqlerrm <> 'shg_test_rollback' then raise; end if;
  end;
end $$;

select 'Fusión de cuentas: todas las pruebas pasaron' as resultado;
