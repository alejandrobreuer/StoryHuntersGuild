-- ═══════════════════════════════════════════════════════════════════════════
-- Finanzas — editing Reservas income rows (run after 055_shg_finance_edit_bookings.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- Safe to run against production: everything runs inside one block that is
-- always rolled back at the end, pass or fail. (Booking numbers used by the
-- test bookings are skipped afterwards — harmless gaps.)
--
-- Paste the whole file in the Supabase SQL editor and run it.
--   Passed → the last result says "Edición de reservas: todas las pruebas pasaron".
--   Failed → an error naming the test that failed.
--
-- Needs at least one admin and one venue.

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
  v_admin   uuid;
  v_event   uuid;
  v_gastos  uuid;
  v_b       shg_bookings;
  v_tx      shg_finance_transactions;
begin
  begin
    select id into v_admin from shg_admin_users order by created_at limit 1;
    perform pg_temp.check(v_admin is not null, 'hay al menos un administrador');
    select id into v_gastos from shg_finance_categories where name = 'Insumos' and type = 'expense';

    insert into shg_events (title, slug, venue_id, starts_at, capacity, price_per_person, status)
      select 'Prueba edición', 'prueba-edicion-' || gen_random_uuid(), id, '1990-05-01', 10, 8000, 'published'
      from shg_venues limit 1
      returning id into v_event;
    perform pg_temp.check(v_event is not null, 'hay al menos un lugar (venue)');

    insert into shg_bookings (event_id, name, email, guest_count, cost)
      values (v_event, 'Cliente Prueba', 'prueba@example.invalid', 2, 16000)
      returning * into v_b;
    select * into v_tx from shg_finance_transactions where booking_id = v_b.id;

    -- ── Unlock → edit → lock ───────────────────────────────────────────────
    perform shg_finance_save(v_admin, v_tx.id, '{"is_locked": false}');
    v_tx := shg_finance_save(v_admin, v_tx.id,
      '{"amount": 14000, "payment_method": "mercado_pago", "notes": "pagó menos", "is_locked": true}');
    perform pg_temp.check(v_tx.amount = 14000 and v_tx.payment_method = 'mercado_pago' and v_tx.is_locked
      and v_tx.source = 'booking' and v_tx.booking_id = v_b.id, 'el ingreso de una reserva se puede editar');
    perform pg_temp.check(
      (select changed_by from shg_finance_audit_log where transaction_id = v_tx.id and action = 'update'
        order by id desc limit 1) = v_admin,
      'auditoría: la edición queda a nombre del administrador');

    -- ── Limits ─────────────────────────────────────────────────────────────
    perform shg_finance_save(v_admin, v_tx.id, '{"is_locked": false}');
    perform pg_temp.expect_error(
      format($q$select shg_finance_save(%L, %L, %L)$q$, v_admin, v_tx.id,
             jsonb_build_object('type', 'expense', 'category_id', v_gastos)),
      'no puede cambiar de tipo', 'no puede pasar a gasto');
    perform pg_temp.expect_error(
      format($q$select shg_finance_save(%L, %L, %L)$q$, v_admin, v_tx.id, jsonb_build_object('responsible_id', v_admin)),
      'shg_finance_tx_responsible_check', 'no lleva responsable');
    perform pg_temp.expect_error(
      format($q$select shg_finance_delete(%L, %L)$q$, v_admin, v_tx.id),
      'cancelá la reserva', 'no se elimina desde Finanzas');
    perform shg_finance_save(v_admin, v_tx.id, '{"is_locked": true}');

    -- ── The booking changes afterwards: only what changed is synced ────────
    perform shg_approve_booking(v_b.id, v_admin);
    select * into v_tx from shg_finance_transactions where booking_id = v_b.id;
    perform pg_temp.check(v_tx.status = 'confirmed' and v_tx.amount = 14000 and v_tx.payment_method = 'mercado_pago',
      'aprobar la reserva confirma el ingreso y conserva el monto corregido');

    update shg_bookings set guest_count = 3 where id = v_b.id;
    select * into v_tx from shg_finance_transactions where booking_id = v_b.id;
    perform pg_temp.check(v_tx.description like '% · 3 lugares' and v_tx.amount = 14000,
      'cambiar los lugares cambia el concepto, no el monto');

    update shg_bookings set cost = 24000 where id = v_b.id;
    perform pg_temp.check((select amount from shg_finance_transactions where booking_id = v_b.id) = 24000,
      'un monto nuevo en la reserva reemplaza al corregido (gana el último cambio)');

    -- ── The backfill leaves edited rows alone ──────────────────────────────
    perform set_config('app.finance_sync', 'on', true);
    update shg_finance_transactions set amount = 5 where booking_id = v_b.id;
    perform set_config('app.finance_sync', '', true);
    perform shg_finance_backfill_bookings();
    perform pg_temp.check((select amount from shg_finance_transactions where booking_id = v_b.id) = 5,
      'el backfill no pisa un ingreso editado a mano');

    raise exception 'shg_test_rollback';
  exception when others then
    if sqlerrm <> 'shg_test_rollback' then raise; end if;
  end;
end $$;

select 'Edición de reservas: todas las pruebas pasaron' as resultado;
