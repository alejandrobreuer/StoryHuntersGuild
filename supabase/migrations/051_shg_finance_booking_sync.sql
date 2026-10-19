-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Finanzas: reservations → income, kept in sync
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 050_shg_finance.sql.
--
-- Every booking has exactly one income row in shg_finance_transactions:
--   booking pending              → status pending
--   booking approved             → status confirmed
--   booking rejected / cancelled → status cancelled (kept for history,
--                                  excluded from totals)
--   cost / seats / event changed → amount / description / event follow
--   booking deleted (its event   → row kept, cancelled, unlinked — done by
--   was deleted)                   the guard in 050 when the FK unlinks it
--
-- Done with triggers on shg_bookings rather than in the booking routes:
-- status changes happen in SQL (shg_approve_booking / shg_reject_booking /
-- shg_cancel_booking) as well as in the API, and a trigger catches every
-- path without touching the reservations code. The writes carry the
-- transaction-local app.finance_sync flag, the only way past the read-only
-- rule on these rows (see 050).
--
-- A sync failure must never stop someone from booking: it's caught and
-- reported as a warning, and running shg_finance_backfill_bookings() again
-- repairs any booking left behind.
--
-- No customer names in the ledger: "Reserva #0158 · 2 lugares".

create or replace function shg_finance_upsert_booking(p_booking_id uuid)
returns void language plpgsql as $$
declare
  v_booking  shg_bookings;
  v_category uuid;
  v_status   shg_finance_tx_status;
begin
  select * into v_booking from shg_bookings where id = p_booking_id;
  if v_booking.id is null then
    return;
  end if;

  select id into v_category from shg_finance_categories where system_key = 'bookings';
  if v_category is null then
    raise exception 'Falta la categoría de sistema "Reservas".';
  end if;

  v_status := case v_booking.status
    when 'approved' then 'confirmed'
    when 'pending'  then 'pending'
    else 'cancelled'
  end;

  perform set_config('app.finance_sync', 'on', true);

  insert into shg_finance_transactions as t (
    occurred_on, type, description, category_id, event_id, payment_method,
    amount, status, source, booking_id, is_locked
  ) values (
    (v_booking.created_at at time zone 'America/Argentina/Buenos_Aires')::date,
    'income',
    format('Reserva #%s · %s %s',
      lpad(v_booking.booking_number::text, 4, '0'),
      v_booking.guest_count,
      case when v_booking.guest_count = 1 then 'lugar' else 'lugares' end),
    v_category,
    v_booking.event_id,
    'transfer',   -- bookings don't record how they paid; the form asks for a transfer receipt
    v_booking.cost,
    v_status,
    'booking',
    v_booking.id,
    true
  )
  on conflict (booking_id) do update set
    description = excluded.description,
    event_id    = excluded.event_id,
    amount      = excluded.amount,
    status      = excluded.status
  -- Skip no-op updates so re-running the backfill leaves no audit noise.
  where (t.description, t.event_id, t.amount, t.status)
        is distinct from (excluded.description, excluded.event_id, excluded.amount, excluded.status);

  perform set_config('app.finance_sync', '', true);
end;
$$;

-- ─── Triggers on shg_bookings ────────────────────────────────────────────────

create or replace function shg_finance_booking_changed()
returns trigger language plpgsql as $$
begin
  begin
    perform shg_finance_upsert_booking(new.id);
  exception when others then
    raise warning 'Finanzas: no se pudo sincronizar la reserva % (%). Corré shg_finance_backfill_bookings() para repararla.',
      new.id, sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists trg_shg_finance_booking_insert on shg_bookings;
create trigger trg_shg_finance_booking_insert
  after insert on shg_bookings
  for each row execute function shg_finance_booking_changed();

-- Only the fields the ledger shows — marking attendance, adding an admin
-- note, etc. don't touch Finanzas.
drop trigger if exists trg_shg_finance_booking_update on shg_bookings;
create trigger trg_shg_finance_booking_update
  after update on shg_bookings
  for each row
  when (old.status         is distinct from new.status
     or old.cost           is distinct from new.cost
     or old.guest_count    is distinct from new.guest_count
     or old.event_id       is distinct from new.event_id
     or old.booking_number is distinct from new.booking_number)
  execute function shg_finance_booking_changed();

-- A booking is only ever deleted along with its event. No trigger for that
-- on purpose: the FK (on delete set null) unlinks the income row, and the
-- guard in 050 turns that unlink into "cancelled" — a single write that
-- can't collide with the event's own cascade. An earlier draft did this in a
-- BEFORE DELETE trigger, which did collide; remove it if it was installed.
drop trigger if exists trg_shg_finance_booking_delete on shg_bookings;
drop function if exists shg_finance_booking_deleted();

-- ─── Backfill ────────────────────────────────────────────────────────────────
-- Idempotent: safe to run any number of times. Creates the missing rows and
-- corrects drifted ones; rows already right are left alone (no audit entry).
-- Returns how many bookings it went through.

create or replace function shg_finance_backfill_bookings()
returns int language plpgsql as $$
declare
  v_id    uuid;
  v_count int := 0;
begin
  for v_id in select id from shg_bookings order by created_at loop
    perform shg_finance_upsert_booking(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- The booking routes reach these through shg_service — say so explicitly
-- rather than relying on the default PUBLIC execute grant.
grant execute on function shg_finance_is_sync() to shg_service;
grant execute on function shg_finance_actor() to shg_service;
grant execute on function shg_finance_upsert_booking(uuid) to shg_service;

select shg_finance_backfill_bookings() as reservas_sincronizadas;
