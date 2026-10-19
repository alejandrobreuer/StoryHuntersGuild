-- ═══════════════════════════════════════════════════════════════════════════
-- Finanzas — database rules + summary math (run after 050_shg_finance.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- Safe to run against production: every test runs inside one block that is
-- always rolled back at the end, pass or fail — nothing it creates survives.
--
-- Paste the whole file in the Supabase SQL editor and run it.
--   Passed → the last result says "Finanzas: todas las pruebas pasaron".
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
  v_insumos  uuid;
  v_juegos   uuid;
  v_reservas uuid;
  v_otros_in uuid;
  v_row      shg_finance_transactions;
  v_id       uuid;
  v_sync_id  uuid;
  v_event    uuid;
  v_s        jsonb;
begin
  begin
    select id into v_admin from shg_admin_users order by created_at limit 1;
    perform pg_temp.check(v_admin is not null, 'hay al menos un administrador');

    select id into v_insumos  from shg_finance_categories where name = 'Insumos'        and type = 'expense';
    select id into v_juegos   from shg_finance_categories where name = 'Juegos'         and type = 'expense';
    select id into v_reservas from shg_finance_categories where name = 'Reservas'       and type = 'income';
    select id into v_otros_in from shg_finance_categories where name = 'Otros ingresos' and type = 'income';
    perform pg_temp.check(v_insumos is not null and v_reservas is not null, 'categorías sembradas');

    -- ── Who is acting ──────────────────────────────────────────────────────
    perform set_config('app.finance_actor', '', true);
    perform pg_temp.expect_error(
      format($q$insert into shg_finance_transactions (occurred_on, type, description, category_id, amount)
                values ('1990-01-05', 'expense', 'x', %L, 10)$q$, v_insumos),
      'Falta el administrador', 'insertar sin administrador falla');

    -- ── Insert through the RPC: saved locked, audited ──────────────────────
    v_row := shg_finance_save(v_admin, null, jsonb_build_object(
      'occurred_on', '1990-02-05', 'type', 'expense', 'description', 'Fundas',
      'category_id', v_insumos, 'payment_method', 'mercado_pago', 'amount', 4500));
    v_id := v_row.id;
    perform pg_temp.check(v_row.is_locked, 'una fila nueva queda bloqueada');
    perform pg_temp.check(v_row.created_by = v_admin and v_row.updated_by = v_admin, 'created_by/updated_by = administrador');
    perform pg_temp.check(v_row.source = 'manual', 'source manual por defecto');
    perform pg_temp.check(
      (select count(*) from shg_finance_audit_log where transaction_id = v_id and action = 'insert' and changed_by = v_admin) = 1,
      'auditoría: insert');

    -- ── Lock ───────────────────────────────────────────────────────────────
    perform set_config('app.finance_actor', v_admin::text, true);
    perform pg_temp.expect_error(
      format($q$update shg_finance_transactions set amount = 1 where id = %L$q$, v_id),
      'bloqueado', 'editar una fila bloqueada falla');
    perform pg_temp.expect_error(
      format($q$select shg_finance_save(%L, %L, '{"amount": 1, "is_locked": false}')$q$, v_admin, v_id),
      'bloqueado', 'desbloquear y editar a la vez falla');
    perform pg_temp.expect_error(
      format($q$select shg_finance_save(%L, %L, '{"amount": 1, "is_locked": true}')$q$, v_admin, v_id),
      'bloqueado', 'guardar sobre una fila bloqueada falla');

    v_row := shg_finance_save(v_admin, v_id, '{"is_locked": false}');
    perform pg_temp.check(not v_row.is_locked, 'desbloquear funciona');
    perform pg_temp.check(
      (select count(*) from shg_finance_audit_log where transaction_id = v_id and action = 'unlock') = 1,
      'auditoría: unlock');

    v_row := shg_finance_save(v_admin, v_id, '{"amount": 5000.5, "description": "Fundas grandes", "is_locked": true}');
    perform pg_temp.check(v_row.is_locked and v_row.amount = 5000.5 and v_row.description = 'Fundas grandes',
      'editar + bloquear en un solo guardado');
    perform pg_temp.check(
      (select count(*) from shg_finance_audit_log where transaction_id = v_id and action = 'update'
         and (before->>'amount')::numeric = 4500 and (after->>'amount')::numeric = 5000.5) = 1,
      'auditoría: update con antes/después');

    -- ── Validation ─────────────────────────────────────────────────────────
    perform shg_finance_save(v_admin, v_id, '{"is_locked": false}');
    perform pg_temp.expect_error(
      format($q$select shg_finance_save(%L, %L, %L)$q$, v_admin, v_id, jsonb_build_object('category_id', v_reservas)),
      'no corresponde', 'categoría de ingreso en un gasto falla');
    perform pg_temp.expect_error(
      format($q$select shg_finance_save(%L, %L, '{"amount": 0}')$q$, v_admin, v_id),
      'shg_finance_tx_amount_check', 'monto 0 en fila manual falla');
    perform pg_temp.expect_error(
      format($q$select shg_finance_save(%L, %L, '{"amount": -5}')$q$, v_admin, v_id),
      'shg_finance_tx_amount_check', 'monto negativo falla');
    perform pg_temp.expect_error(
      format($q$select shg_finance_save(%L, %L, '{"description": "   "}')$q$, v_admin, v_id),
      'description', 'concepto vacío falla');
    perform pg_temp.expect_error(
      format($q$update shg_finance_transactions set source = 'booking' where id = %L$q$, v_id),
      'no se puede cambiar', 'cambiar el origen falla');

    -- ── Delete = soft delete, only unlocked ────────────────────────────────
    perform shg_finance_save(v_admin, v_id, '{"is_locked": true}');
    perform pg_temp.check(
      (select action from shg_finance_audit_log where transaction_id = v_id order by id desc limit 1) = 'lock',
      'auditoría: lock');
    perform pg_temp.expect_error(
      format($q$select shg_finance_delete(%L, %L)$q$, v_admin, v_id),
      'bloqueado', 'eliminar una fila bloqueada falla');
    perform pg_temp.expect_error(
      format($q$delete from shg_finance_transactions where id = %L$q$, v_id),
      'no se borran', 'borrado físico falla');
    perform shg_finance_save(v_admin, v_id, '{"is_locked": false}');
    v_row := shg_finance_delete(v_admin, v_id);
    perform pg_temp.check(v_row.deleted_at is not null, 'eliminar una fila desbloqueada funciona');
    perform pg_temp.check(
      (select count(*) from shg_finance_audit_log where transaction_id = v_id and action = 'delete') = 1,
      'auditoría: delete');
    perform pg_temp.expect_error(
      format($q$select shg_finance_save(%L, %L, '{"amount": 9}')$q$, v_admin, v_id),
      'eliminado', 'editar una fila eliminada falla');

    -- ── Rows from Reservas are read-only here ──────────────────────────────
    perform pg_temp.expect_error(
      format($q$insert into shg_finance_transactions (occurred_on, type, description, category_id, amount, source)
                values ('1990-01-05', 'income', 'x', %L, 10, 'booking')$q$, v_reservas),
      'sincronización', 'crear una fila de reserva a mano falla');

    perform set_config('app.finance_sync', 'on', true);
    insert into shg_finance_transactions (occurred_on, type, description, category_id, amount, source, status)
      values ('1990-01-06', 'income', 'Reserva #0 · 1 lugar', v_reservas, 0, 'booking', 'pending')
      returning id into v_sync_id;
    perform pg_temp.check(
      (select count(*) from shg_finance_audit_log where transaction_id = v_sync_id and action = 'sync' and changed_by is null) = 1,
      'auditoría: sync sin administrador');
    perform set_config('app.finance_sync', '', true);

    perform pg_temp.expect_error(
      format($q$select shg_finance_save(%L, %L, '{"is_locked": false}')$q$, v_admin, v_sync_id),
      'Reservas', 'desbloquear una fila de reserva falla');
    perform pg_temp.expect_error(
      format($q$update shg_finance_transactions set status = 'confirmed' where id = %L$q$, v_sync_id),
      'Reservas', 'editar una fila de reserva falla');

    -- ── Categories ─────────────────────────────────────────────────────────
    perform pg_temp.expect_error(
      format($q$update shg_finance_categories set is_active = false where id = %L$q$, v_reservas),
      'no se pueden desactivar', 'desactivar categoría del sistema falla');
    perform pg_temp.expect_error(
      format($q$delete from shg_finance_categories where id = %L$q$, v_reservas),
      'no se pueden eliminar', 'eliminar categoría del sistema falla');
    update shg_finance_categories set name = 'Reservas web', sort_order = 9 where id = v_reservas;
    perform pg_temp.check((select name from shg_finance_categories where id = v_reservas) = 'Reservas web',
      'renombrar categoría del sistema funciona');
    perform pg_temp.check((select system_key from shg_finance_categories where id = v_reservas) = 'bookings',
      'renombrar no cambia la clave del sistema');
    perform pg_temp.expect_error(
      format($q$update shg_finance_categories set type = 'income' where id = %L$q$, v_insumos),
      'ya tiene movimientos', 'cambiar tipo de categoría con movimientos falla');

    -- ── Deleting an event doesn't trip the lock ────────────────────────────
    insert into shg_events (title, slug, venue_id, starts_at, capacity, price_per_person)
      select 'Prueba finanzas', 'prueba-finanzas-' || gen_random_uuid(), id, '1990-01-01', 10, 0
      from shg_venues limit 1
      returning id into v_event;
    if v_event is not null then
      v_row := shg_finance_save(v_admin, null, jsonb_build_object('occurred_on', '1990-01-02', 'type', 'expense',
        'description', 'Gasto del evento', 'category_id', v_insumos, 'amount', 10, 'event_id', v_event));
      delete from shg_events where id = v_event;
      perform pg_temp.check(
        (select event_id is null and is_locked from shg_finance_transactions where id = v_row.id),
        'borrar un evento deja la fila bloqueada en General');
      perform pg_temp.check(
        (select action from shg_finance_audit_log where transaction_id = v_row.id order by id desc limit 1) = 'sync',
        'auditoría: el borrado del evento queda como sistema');
      perform pg_temp.expect_error(
        format($q$select shg_finance_save(%L, %L, '{"event_id": null}')$q$, v_admin, v_row.id),
        'bloqueado', 'quitar el evento a mano sigue respetando el candado');
    end if;

    -- ── Summary math (1990, so real data never mixes in) ───────────────────
    perform shg_finance_save(v_admin, null, jsonb_build_object('occurred_on', '1990-02-10', 'type', 'income',
      'description', 'Venta', 'category_id', v_otros_in, 'amount', 1000));
    perform shg_finance_save(v_admin, null, jsonb_build_object('occurred_on', '1990-02-11', 'type', 'expense',
      'description', 'Juego', 'category_id', v_juegos, 'amount', 300));
    perform shg_finance_save(v_admin, null, jsonb_build_object('occurred_on', '1990-03-01', 'type', 'expense',
      'description', 'Fundas', 'category_id', v_insumos, 'amount', 200));
    perform shg_finance_save(v_admin, null, jsonb_build_object('occurred_on', '1990-03-02', 'type', 'income',
      'description', 'Seña', 'category_id', v_otros_in, 'amount', 50, 'status', 'pending'));
    perform shg_finance_save(v_admin, null, jsonb_build_object('occurred_on', '1990-03-03', 'type', 'expense',
      'description', 'Por pagar', 'category_id', v_insumos, 'amount', 70, 'status', 'pending'));
    perform shg_finance_save(v_admin, null, jsonb_build_object('occurred_on', '1990-03-04', 'type', 'income',
      'description', 'Anulado', 'category_id', v_otros_in, 'amount', 999, 'status', 'cancelled'));

    v_s := shg_finance_summary('1990-02-01', '1990-03-31');
    perform pg_temp.check((v_s->'kpis'->>'income')::numeric = 1000, 'resumen: ingresos confirmados');
    perform pg_temp.check((v_s->'kpis'->>'expense')::numeric = 500, 'resumen: gastos confirmados (sin eliminados)');
    perform pg_temp.check((v_s->'kpis'->>'result')::numeric = 500, 'resumen: resultado');
    perform pg_temp.check((v_s->'kpis'->>'receivable')::numeric = 50, 'resumen: por cobrar');
    perform pg_temp.check((v_s->'kpis'->>'payable')::numeric = 70, 'resumen: por pagar');
    perform pg_temp.check(jsonb_array_length(v_s->'monthly') = 2, 'resumen: un punto por mes del rango');
    perform pg_temp.check((v_s->'monthly'->0->>'income')::numeric = 1000
      and (v_s->'monthly'->1->>'expense')::numeric = 200, 'resumen: serie mensual');
    perform pg_temp.check(v_s->'by_category'->0->>'name' = 'Juegos'
      and (v_s->'by_category'->0->>'amount')::numeric = 300, 'resumen: categorías ordenadas de mayor a menor');
    perform pg_temp.check(jsonb_array_length(v_s->'per_event') = 1
      and v_s->'per_event'->0->>'event_id' is null
      and (v_s->'per_event'->0->>'result')::numeric = 500, 'resumen: fila de gastos generales');

    v_s := shg_finance_summary('1990-02-01', '1990-03-31', null, false, v_juegos);
    perform pg_temp.check((v_s->'kpis'->>'expense')::numeric = 300 and (v_s->'kpis'->>'income')::numeric = 0,
      'resumen: filtro por categoría');

    v_s := shg_finance_summary('1989-01-01', '1989-01-31');
    perform pg_temp.check((v_s->'kpis'->>'income')::numeric = 0 and jsonb_array_length(v_s->'per_event') = 0,
      'resumen: período vacío');

    raise exception 'shg_test_rollback';
  exception when others then
    if sqlerrm <> 'shg_test_rollback' then raise; end if;
  end;
end $$;

select 'Finanzas: todas las pruebas pasaron' as resultado;
