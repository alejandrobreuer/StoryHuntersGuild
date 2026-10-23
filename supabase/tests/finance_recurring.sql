-- ═══════════════════════════════════════════════════════════════════════════
-- Finanzas — Suscripciones (run after 054_shg_finance_recurring.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- Safe to run against production: every test runs inside one block that is
-- always rolled back at the end, pass or fail — nothing it creates survives.
-- It works in 1990 (p_today), so real subscriptions never generate here.
--
-- Paste the whole file in the Supabase SQL editor and run it.
--   Passed → the last result says "Suscripciones: todas las pruebas pasaron".
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
  v_tech     uuid;
  v_reservas uuid;
  v_sub      uuid;
  v_short    uuid;
  v_row      shg_finance_transactions;
  v_n        int;
begin
  begin
    select id into v_admin from shg_admin_users order by created_at limit 1;
    perform pg_temp.check(v_admin is not null, 'hay al menos un administrador');
    select id into v_tech     from shg_finance_categories where name = 'Tecnología' and type = 'expense';
    select id into v_reservas from shg_finance_categories where system_key = 'bookings';

    -- ── Subscription rules ─────────────────────────────────────────────────
    perform pg_temp.expect_error(
      format($q$insert into shg_finance_recurring (name, category_id, amount, day_of_month, starts_on)
                values ('X', %L, 100, 5, '1990-01-01')$q$, v_reservas),
      'categoría de gastos', 'una suscripción no usa una categoría de ingresos');
    perform pg_temp.expect_error(
      format($q$insert into shg_finance_recurring (name, category_id, amount, day_of_month, starts_on)
                values ('X', %L, 100, 32, '1990-01-01')$q$, v_tech),
      'day_of_month', 'el día va de 1 a 31');

    insert into shg_finance_recurring (name, category_id, amount, day_of_month, starts_on, responsible_id, created_by)
    values ('Prueba Hosting', v_tech, 25000, 10, '1990-01-15', v_admin, v_admin)
    returning id into v_sub;

    -- ── Generation ─────────────────────────────────────────────────────────
    -- Starts 15/01 with day 10: January's charge (10/01) is before the start.
    v_n := shg_finance_run_recurring('1990-03-09');
    perform pg_temp.check(
      (select count(*) from shg_finance_transactions where recurring_id = v_sub) = 1,
      'sólo febrero: enero es antes del inicio y el 10/03 todavía no llegó');
    select * into v_row from shg_finance_transactions where recurring_id = v_sub;
    perform pg_temp.check(
      v_row.occurred_on = '1990-02-10' and v_row.recurring_period = '1990-02-01'
      and v_row.description = 'Prueba Hosting — febrero 1990' and v_row.amount = 25000
      and v_row.status = 'pending' and v_row.type = 'expense' and v_row.source = 'manual'
      and v_row.is_locked and v_row.responsible_id = v_admin and v_row.payment_method = 'card',
      'la fila generada copia la suscripción');
    perform pg_temp.check(
      (select action from shg_finance_audit_log where transaction_id = v_row.id) = 'sync',
      'auditoría: la crea el sistema');

    v_n := shg_finance_run_recurring('1990-03-10');
    perform pg_temp.check(v_n >= 1 and
      (select count(*) from shg_finance_transactions where recurring_id = v_sub) = 2, 'el día del cobro crea marzo');
    v_n := shg_finance_run_recurring('1990-03-31');
    perform pg_temp.check(
      (select count(*) from shg_finance_transactions where recurring_id = v_sub) = 2, 'correrlo de nuevo no duplica');

    -- Day 31 in short months → last day of the month.
    insert into shg_finance_recurring (name, category_id, amount, day_of_month, starts_on, ends_on)
    values ('Prueba Dominio', v_tech, 1000, 31, '1990-01-01', '1990-03-30')
    returning id into v_short;
    perform shg_finance_run_recurring('1990-05-31');
    perform pg_temp.check(
      array(select occurred_on from shg_finance_transactions where recurring_id = v_short order by occurred_on)
        = array['1990-01-31', '1990-02-28']::date[],
      'día 31 → 28/02; marzo (31/03) queda después de la fecha de fin');

    -- ── Editing a generated row ────────────────────────────────────────────
    perform shg_finance_save(v_admin, v_row.id, '{"is_locked": false}');
    v_row := shg_finance_save(v_admin, v_row.id, '{"amount": 26100, "status": "confirmed", "is_locked": true}');
    perform pg_temp.check(v_row.amount = 26100 and v_row.recurring_id = v_sub, 'se corrige como cualquier fila');

    perform set_config('app.finance_actor', v_admin::text, true);
    perform pg_temp.expect_error(
      format($q$update shg_finance_transactions set recurring_id = null, recurring_period = null where id = %L$q$, v_row.id),
      'no se puede cambiar', 'no se puede desvincular de la suscripción');
    perform pg_temp.expect_error(
      format($q$insert into shg_finance_transactions (occurred_on, type, description, category_id, amount, recurring_id, recurring_period)
                values ('1990-06-10', 'expense', 'Trucha', %L, 100, %L, '1990-06-01')$q$, v_tech, v_sub),
      'sólo los crea el sistema', 'una fila manual no se puede vincular a mano');

    -- A deleted month stays deleted.
    perform shg_finance_save(v_admin, v_row.id, '{"is_locked": false}');
    perform shg_finance_delete(v_admin, v_row.id);
    perform shg_finance_run_recurring('1990-03-31');
    perform pg_temp.check(
      (select count(*) from shg_finance_transactions
        where recurring_id = v_sub and recurring_period = '1990-02-01' and deleted_at is null) = 0,
      'un mes eliminado no se vuelve a crear');
    perform set_config('app.finance_actor', '', true);

    -- ── Pause / delete ─────────────────────────────────────────────────────
    update shg_finance_recurring set is_active = false where id = v_sub;
    perform shg_finance_run_recurring('1990-05-31');
    perform pg_temp.check(
      (select count(*) from shg_finance_transactions where recurring_id = v_sub) = 2, 'pausada no genera');
    update shg_finance_recurring set is_active = true where id = v_sub;
    perform pg_temp.check(
      (select starts_on from shg_finance_recurring where id = v_sub)
        = (now() at time zone 'America/Argentina/Buenos_Aires')::date,
      'al reactivarla arranca de hoy (no cobra los meses pausados)');

    perform pg_temp.expect_error(
      format($q$delete from shg_finance_recurring where id = %L$q$, v_sub),
      'foreign key', 'con movimientos no se puede eliminar');

    raise exception 'shg_test_rollback';
  exception when others then
    if sqlerrm <> 'shg_test_rollback' then raise; end if;
  end;
end $$;

select 'Suscripciones: todas las pruebas pasaron' as resultado;
