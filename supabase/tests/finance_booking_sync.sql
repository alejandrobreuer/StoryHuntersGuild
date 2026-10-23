-- ═══════════════════════════════════════════════════════════════════════════
-- Finanzas — reservations → income sync (run after 051_shg_finance_booking_sync.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- Safe to run against production: everything runs inside one block that is
-- always rolled back at the end, pass or fail. (Booking numbers used by the
-- test bookings are skipped afterwards — harmless gaps.)
--
-- Paste the whole file in the Supabase SQL editor and run it.
--   Passed → the last result says "Sincronización de reservas: todas las pruebas pasaron".
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
  v_event   uuid;
  v_event2  uuid;
  v_b1      shg_bookings;
  v_b2      shg_bookings;
  v_free    shg_bookings;
  v_tx      shg_finance_transactions;
  v_audits  int;
  v_s       jsonb;
begin
  begin
    select id into v_admin from shg_admin_users order by created_at limit 1;
    perform pg_temp.check(v_admin is not null, 'hay al menos un administrador');

    -- ── Every existing booking already has its row (the backfill ran) ──────
    perform pg_temp.check(
      (select count(*) from shg_bookings b
        where not exists (select 1 from shg_finance_transactions t where t.booking_id = b.id)) = 0,
      'backfill: cada reserva existente tiene su ingreso');
    perform pg_temp.check(
      (select count(*) from shg_finance_transactions t
         join shg_bookings b on b.id = t.booking_id
        where t.status <> case b.status when 'approved' then 'confirmed'::shg_finance_tx_status
                                        when 'pending'  then 'pending'::shg_finance_tx_status
                                        else 'cancelled'::shg_finance_tx_status end
           or t.amount <> b.cost) = 0,
      'backfill: estado y monto coinciden con cada reserva');

    -- ── Test event (1990, outside any real range) ──────────────────────────
    insert into shg_events (title, slug, venue_id, starts_at, capacity, price_per_person, status)
      select 'Prueba sync', 'prueba-sync-' || gen_random_uuid(), id, '1990-05-01', 10, 8000, 'published'
      from shg_venues limit 1
      returning id into v_event;
    perform pg_temp.check(v_event is not null, 'hay al menos un lugar (venue)');
    insert into shg_events (title, slug, venue_id, starts_at, capacity, price_per_person, status)
      select 'Prueba sync 2', 'prueba-sync-2-' || gen_random_uuid(), venue_id, '1990-06-01', 10, 8000, 'published'
      from shg_events where id = v_event
      returning id into v_event2;

    -- ── Created → pending ──────────────────────────────────────────────────
    insert into shg_bookings (event_id, name, email, guest_count, cost, created_at)
      values (v_event, 'Cliente Prueba', 'prueba@example.invalid', 2, 16000, '1990-04-20 23:30-03')
      returning * into v_b1;
    select * into v_tx from shg_finance_transactions where booking_id = v_b1.id;
    perform pg_temp.check(v_tx.id is not null, 'crear reserva crea un ingreso');
    perform pg_temp.check(v_tx.type = 'income' and v_tx.status = 'pending' and v_tx.source = 'booking'
      and v_tx.is_locked and v_tx.amount = 16000 and v_tx.event_id = v_event, 'ingreso pendiente, bloqueado, de Reservas');
    perform pg_temp.check(v_tx.category_id = (select id from shg_finance_categories where system_key = 'bookings'),
      'categoría Reservas');
    perform pg_temp.check(v_tx.description = format('Reserva #%s · 2 lugares', lpad(v_b1.booking_number::text, 4, '0')),
      'concepto "Reserva #NNNN · 2 lugares", sin el nombre del cliente');
    perform pg_temp.check(v_tx.occurred_on = '1990-04-20', 'fecha = día de la reserva en hora de Argentina');
    perform pg_temp.check(v_tx.payment_method = 'transfer', 'medio: transferencia');

    -- ── Approved → confirmed ───────────────────────────────────────────────
    perform shg_approve_booking(v_b1.id, v_admin);
    perform pg_temp.check((select status from shg_finance_transactions where booking_id = v_b1.id) = 'confirmed',
      'aprobar la reserva confirma el ingreso');

    -- ── Seats / cost / event change follow ─────────────────────────────────
    update shg_bookings set guest_count = 1, cost = 8000, event_id = v_event2 where id = v_b1.id;
    select * into v_tx from shg_finance_transactions where booking_id = v_b1.id;
    perform pg_temp.check(v_tx.amount = 8000 and v_tx.event_id = v_event2
      and v_tx.description like '% · 1 lugar', 'cambios de lugares, monto y evento se reflejan');

    -- ── Unrelated booking edits don't touch the ledger ─────────────────────
    select count(*) into v_audits from shg_finance_audit_log where transaction_id = v_tx.id;
    update shg_bookings set attended = true, admin_note = 'vino' where id = v_b1.id;
    perform pg_temp.check((select count(*) from shg_finance_audit_log where transaction_id = v_tx.id) = v_audits,
      'marcar asistencia no genera cambios en Finanzas');

    -- ── Approved → cancelled ───────────────────────────────────────────────
    perform shg_cancel_booking(v_b1.id, v_admin);
    perform pg_temp.check((select status from shg_finance_transactions where booking_id = v_b1.id) = 'cancelled',
      'cancelar la reserva cancela el ingreso');

    -- ── Pending → rejected → cancelled ─────────────────────────────────────
    insert into shg_bookings (event_id, name, email, guest_count, cost)
      values (v_event, 'Otra Prueba', 'otra@example.invalid', 3, 24000)
      returning * into v_b2;
    perform shg_reject_booking(v_b2.id, v_admin, 'prueba');
    perform pg_temp.check((select status from shg_finance_transactions where booking_id = v_b2.id) = 'cancelled',
      'rechazar la reserva cancela el ingreso');

    -- ── Exactly one row per booking ────────────────────────────────────────
    perform pg_temp.check(
      (select count(*) from shg_finance_transactions where booking_id in (v_b1.id, v_b2.id)) = 2,
      'exactamente un ingreso por reserva');

    -- ── Free booking ($0) still syncs ──────────────────────────────────────
    insert into shg_bookings (event_id, name, email, guest_count, cost)
      values (v_event, 'Gratis', 'gratis@example.invalid', 1, 0)
      returning * into v_free;
    perform pg_temp.check((select amount from shg_finance_transactions where booking_id = v_free.id) = 0,
      'una reserva gratis crea un ingreso de $ 0');

    -- (Editing these rows by hand: finance_booking_edit.sql, after 055.)

    -- ── Backfill is idempotent ─────────────────────────────────────────────
    select count(*) into v_audits from shg_finance_audit_log;
    perform shg_finance_backfill_bookings();
    perform shg_finance_backfill_bookings();
    perform pg_temp.check((select count(*) from shg_finance_audit_log) = v_audits,
      'backfill repetido no cambia nada');
    perform pg_temp.check(
      (select count(*) from shg_finance_transactions where booking_id is not null)
        = (select count(*) from shg_bookings), 'backfill: un ingreso por reserva, sin duplicados');

    -- ── Backfill repairs drift ─────────────────────────────────────────────
    perform set_config('app.finance_sync', 'on', true);
    update shg_finance_transactions set status = 'pending', amount = 1 where booking_id = v_b2.id;
    perform set_config('app.finance_sync', '', true);
    perform shg_finance_backfill_bookings();
    perform pg_temp.check(
      (select status = 'cancelled' and amount = 24000 from shg_finance_transactions where booking_id = v_b2.id),
      'backfill corrige un ingreso desactualizado');

    -- ── Seats in the dashboard summary ─────────────────────────────────────
    insert into shg_bookings (event_id, name, email, guest_count, cost, created_at)
      values (v_event, 'Asientos', 'asientos@example.invalid', 4, 32000, '1990-04-25 12:00-03')
      returning * into v_b2;
    perform shg_approve_booking(v_b2.id, v_admin);
    v_s := shg_finance_summary('1990-04-01', '1990-04-30', v_event);
    perform pg_temp.check((v_s->'kpis'->>'seats')::int = 4 and (v_s->'kpis'->>'seat_events')::int = 1
      and (v_s->'kpis'->>'income')::numeric = 32000, 'resumen: lugares vendidos de reservas confirmadas');
    perform pg_temp.check((v_s->'per_event'->0->>'seats')::int = 4, 'resumen: lugares por encuentro');

    -- ── Event deleted → its bookings' rows are kept, cancelled ─────────────
    -- The event had three bookings (rejected, free, approved).
    create temp table finance_test_rows on commit drop as
      select id from shg_finance_transactions
      where booking_id in (select id from shg_bookings where event_id = v_event);
    delete from shg_events where id = v_event;
    if (select count(*) from shg_finance_transactions t join finance_test_rows r on r.id = t.id
         where t.booking_id is null and t.event_id is null and t.status = 'cancelled') <> 3 then
      raise exception 'FALLÓ [borrar el evento conserva los ingresos, cancelados y sin vínculo]: %',
        (select string_agg(format('status=%s booking=%s event=%s', t.status, t.booking_id, t.event_id), '; ')
           from shg_finance_transactions t join finance_test_rows r on r.id = t.id);
    end if;

    raise exception 'shg_test_rollback';
  exception when others then
    if sqlerrm <> 'shg_test_rollback' then raise; end if;
  end;
end $$;

select 'Sincronización de reservas: todas las pruebas pasaron' as resultado;
