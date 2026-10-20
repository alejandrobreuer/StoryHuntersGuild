-- ═══════════════════════════════════════════════════════════════════════════
-- Finanzas — "Responsable" (run after 052_shg_finance_responsible.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- Safe to run against production: every test runs inside one block that is
-- always rolled back at the end, pass or fail — nothing it creates survives.
--
-- Paste the whole file in the Supabase SQL editor and run it.
--   Passed → the last result says "Responsable: todas las pruebas pasaron".
--   Failed → an error naming the test that failed.
--
-- Needs at least one row in shg_admin_users (used as the acting admin).

create or replace function pg_temp.expect_error(p_sql text, p_like text, p_test text)
returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FALLÓ [%]: se esperaba un error "%", pero funcionó', p_test, p_like;
exception when others then
  if sqlerrm like 'FALLÓ%' or sqlerrm not ilike '%' || p_like || '%' then
    raise exception 'FALLÓ [%]: %', p_test, sqlerrm;
  end if;
end;
$$;

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
  v_admin    uuid;
  v_other    uuid;
  v_insumos  uuid;
  v_reservas uuid;
  v_row      shg_finance_transactions;
  v_id       uuid;
begin
  begin
    select id into v_admin from shg_admin_users order by created_at limit 1;
    perform pg_temp.check(v_admin is not null, 'hay al menos un administrador');

    -- A second team member, deleted further down.
    insert into shg_admin_users (email, name, role_id)
    select 'shg-test-responsable@example.invalid', 'Prueba Responsable', role_id
    from shg_admin_users where id = v_admin
    returning id into v_other;

    select id into v_insumos  from shg_finance_categories where name = 'Insumos' and type = 'expense';
    select id into v_reservas from shg_finance_categories where system_key = 'bookings';

    -- ── Default and explicit values ────────────────────────────────────────
    v_row := shg_finance_save(v_admin, null, jsonb_build_object(
      'occurred_on', '1990-02-05', 'type', 'expense', 'description', 'Fundas',
      'category_id', v_insumos, 'amount', 4500));
    perform pg_temp.check(v_row.responsible_id = v_admin, 'sin responsable → quien lo carga');

    v_row := shg_finance_save(v_admin, null, jsonb_build_object(
      'occurred_on', '1990-02-05', 'type', 'expense', 'description', 'Fundas',
      'category_id', v_insumos, 'amount', 4500, 'responsible_id', null));
    perform pg_temp.check(v_row.responsible_id is null, 'responsable null → nadie');

    v_row := shg_finance_save(v_admin, null, jsonb_build_object(
      'occurred_on', '1990-02-05', 'type', 'expense', 'description', 'Snacks',
      'category_id', v_insumos, 'amount', 3000, 'responsible_id', v_other));
    v_id := v_row.id;
    perform pg_temp.check(v_row.responsible_id = v_other and v_row.created_by = v_admin,
      'otro responsable; created_by sigue siendo quien lo carga');

    -- ── Lock ───────────────────────────────────────────────────────────────
    perform pg_temp.expect_error(
      format($q$select shg_finance_save(%L, %L, %L)$q$, v_admin, v_id, jsonb_build_object('responsible_id', v_admin)),
      'bloqueado', 'cambiar el responsable de una fila bloqueada falla');

    perform shg_finance_save(v_admin, v_id, '{"is_locked": false}');
    v_row := shg_finance_save(v_admin, v_id, jsonb_build_object('responsible_id', v_admin, 'is_locked', true));
    perform pg_temp.check(v_row.responsible_id = v_admin, 'desbloqueada, el responsable se cambia');
    perform pg_temp.check(
      (select count(*) from shg_finance_audit_log where transaction_id = v_id and action = 'update'
         and (before->>'responsible_id')::uuid = v_other and (after->>'responsible_id')::uuid = v_admin) = 1,
      'auditoría: cambio de responsable');

    v_row := shg_finance_save(v_admin, v_id, '{"is_locked": false}');
    perform pg_temp.check(v_row.responsible_id = v_admin, 'guardar sin el campo lo deja como estaba');

    -- ── Deleting the admin empties it, even on a locked row ────────────────
    v_row := shg_finance_save(v_admin, v_id, jsonb_build_object('responsible_id', v_other, 'is_locked', true));
    perform set_config('app.finance_actor', '', true);
    delete from shg_admin_users where id = v_other;
    select * into v_row from shg_finance_transactions where id = v_id;
    perform pg_temp.check(v_row.responsible_id is null and v_row.is_locked and v_row.amount = 3000,
      'borrar al administrador vacía el responsable y no toca el resto');
    perform pg_temp.check(
      (select action from shg_finance_audit_log where transaction_id = v_id order by id desc limit 1) = 'sync',
      'auditoría: el borrado del administrador queda como sistema');

    -- ── Only manual rows ───────────────────────────────────────────────────
    perform set_config('app.finance_sync', 'on', true);
    perform pg_temp.expect_error(
      format($q$insert into shg_finance_transactions (occurred_on, type, description, category_id, amount, source, responsible_id)
                values ('1990-02-05', 'income', 'Reserva', %L, 100, 'booking', %L)$q$, v_reservas, v_admin),
      'shg_finance_tx_responsible_check', 'una fila de reserva no lleva responsable');
    perform set_config('app.finance_sync', '', true);

    raise exception 'shg_test_rollback';
  exception when others then
    if sqlerrm <> 'shg_test_rollback' then raise; end if;
  end;
end $$;

select 'Responsable: todas las pruebas pasaron' as resultado;
