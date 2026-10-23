-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Finanzas: Reservas income rows become editable
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 054_shg_finance_recurring.sql.
--
-- Until now a booking's income row was read-only in Finanzas (050 rule 2).
-- From here it can be unlocked, edited and locked like a manual row (the UI
-- asks for confirmation first), except that it:
--   * keeps its type (always income),
--   * can't be deleted here (it belongs to the booking: cancel it in Reservas),
--   * carries no Responsable (the money goes to the guild's account — 052).
--
-- How it lives with the sync (051): a change to the booking only rewrites
-- the ledger fields that change touched —
--   status        → status
--   cost          → amount
--   seats / number→ description
--   event         → event
-- so approving a booking doesn't undo an amount fixed by hand, while a new
-- cost on the booking does replace it (the latest change wins). The backfill,
-- which repairs drifted rows, leaves alone any row a person has edited.
--
-- Memberships rows (source 'subscription', not written by anything yet)
-- stay read-only.

-- ─── Guard: same as 052, booking rows editable with the limits above ────────

create or replace function shg_finance_tx_guard()
returns trigger language plpgsql as $$
declare
  v_sync  boolean := shg_finance_is_sync();
  v_actor uuid    := shg_finance_actor();
  v_cat_type shg_finance_tx_type;
  -- Columns the lock compares; bookkeeping columns may change on an unlock.
  v_ignore text[] := array['is_locked', 'updated_at', 'updated_by'];
  v_link_cols text[] := array['event_id', 'booking_id', 'created_by', 'updated_by', 'updated_at',
                                 'responsible_id'];
begin
  if tg_op = 'DELETE' then
    raise exception 'Los movimientos no se borran: se eliminan (quedan en el historial).';
  end if;

  if tg_op = 'INSERT' then
    if not v_sync then
      if v_actor is null then
        raise exception 'Falta el administrador que hace el cambio (app.finance_actor).';
      end if;
      if new.source <> 'manual' or new.booking_id is not null or new.subscription_id is not null then
        raise exception 'Los movimientos automáticos sólo los crea la sincronización.';
      end if;
      if new.deleted_at is not null then
        raise exception 'No se puede crear un movimiento ya eliminado.';
      end if;
      new.created_by := v_actor;
      new.updated_by := v_actor;
    end if;
    new.created_at := now();
    new.updated_at := now();
  else  -- UPDATE
    -- Deleting an event, booking or admin makes Postgres null the matching
    -- column here (on delete set null). That arrives as a nested update with
    -- no actor and may hit a locked row; refusing it would block the delete
    -- itself. Allow exactly that: only those links going null, and only from
    -- inside another trigger (an RPC/API update runs at depth 1).
    -- updated_by is cleared to mark it as the system's change: a cascade's
    -- AFTER triggers run at the outer statement's depth, so the audit
    -- trigger can't detect it any other way, and a manual update always
    -- carries an actor.
    if not v_sync and pg_trigger_depth() > 1
       and (to_jsonb(new) - v_link_cols) = (to_jsonb(old) - v_link_cols)
       and (new.event_id   is null or new.event_id   = old.event_id)
       and (new.booking_id is null or new.booking_id = old.booking_id)
       and (new.created_by is null or new.created_by = old.created_by)
       and (new.updated_by is null or new.updated_by = old.updated_by)
       and (new.responsible_id is null or new.responsible_id = old.responsible_id) then
      new.updated_by := null;
      new.updated_at := now();
      -- A reservation's booking only goes away with its event: keep the
      -- income for history, cancelled.
      if old.source = 'booking' and old.booking_id is not null and new.booking_id is null then
        new.status := 'cancelled';
      end if;
      return new;
    end if;

    if not v_sync then
      if v_actor is null then
        raise exception 'Falta el administrador que hace el cambio (app.finance_actor).';
      end if;
      if old.source = 'subscription' then
        raise exception 'Este movimiento es automático y no se edita desde acá.';
      end if;
      if old.deleted_at is not null then
        raise exception 'Este movimiento fue eliminado.';
      end if;
      if old.source = 'booking' then
        if new.deleted_at is not null then
          raise exception 'El ingreso de una reserva no se elimina desde Finanzas: cancelá la reserva en Reservas.';
        end if;
        if new.type is distinct from old.type then
          raise exception 'El ingreso de una reserva no puede cambiar de tipo.';
        end if;
      end if;
      if old.is_locked
         and not (new.is_locked = false
                  and (to_jsonb(new) - v_ignore) = (to_jsonb(old) - v_ignore)) then
        raise exception 'El movimiento está bloqueado: desbloquealo para editarlo.';
      end if;
      if new.source is distinct from old.source
         or new.booking_id is distinct from old.booking_id
         or new.subscription_id is distinct from old.subscription_id
         or new.created_by is distinct from old.created_by
         or new.created_at is distinct from old.created_at then
        raise exception 'Ese dato del movimiento no se puede cambiar.';
      end if;
      if new.deleted_at is not null and new.is_locked then
        raise exception 'Desbloqueá el movimiento antes de eliminarlo.';
      end if;
      new.updated_by := v_actor;
    end if;
    new.updated_at := now();
  end if;

  select type into v_cat_type from shg_finance_categories where id = new.category_id;
  if v_cat_type is distinct from new.type then
    raise exception 'La categoría no corresponde al tipo de movimiento.';
  end if;

  return new;
end;
$$;

-- ─── Sync: only the fields the booking change touched ────────────────────────
-- p_fields null = all of them (a new booking, or the backfill). The backfill
-- skips rows a person has edited (an 'update' in the audit log with an
-- admin), so it never undoes a correction made by hand.

drop function if exists shg_finance_upsert_booking(uuid);

create or replace function shg_finance_upsert_booking(p_booking_id uuid, p_fields text[] default null)
returns void language plpgsql as $$
declare
  v_booking  shg_bookings;
  v_category uuid;
  v_status   shg_finance_tx_status;
  v_all      boolean := p_fields is null;
  v_edited   boolean;
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

  v_edited := exists (
    select 1 from shg_finance_audit_log a
    join shg_finance_transactions t on t.id = a.transaction_id
    where t.booking_id = p_booking_id and a.action = 'update' and a.changed_by is not null
  );
  if v_all and v_edited then
    -- Backfill over a row edited by hand: only make sure it exists.
    p_fields := array[]::text[];
    v_all := false;
  end if;

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
    description = case when v_all or 'description' = any(p_fields) then excluded.description else t.description end,
    event_id    = case when v_all or 'event_id'    = any(p_fields) then excluded.event_id    else t.event_id end,
    amount      = case when v_all or 'amount'      = any(p_fields) then excluded.amount      else t.amount end,
    status      = case when v_all or 'status'      = any(p_fields) then excluded.status      else t.status end
  -- Skip no-op updates so re-running the backfill leaves no audit noise.
  where (t.description, t.event_id, t.amount, t.status) is distinct from (
    case when v_all or 'description' = any(p_fields) then excluded.description else t.description end,
    case when v_all or 'event_id'    = any(p_fields) then excluded.event_id    else t.event_id end,
    case when v_all or 'amount'      = any(p_fields) then excluded.amount      else t.amount end,
    case when v_all or 'status'      = any(p_fields) then excluded.status      else t.status end);

  perform set_config('app.finance_sync', '', true);
end;
$$;

create or replace function shg_finance_booking_changed()
returns trigger language plpgsql as $$
declare
  v_fields text[];
begin
  if tg_op = 'UPDATE' then
    v_fields := array_remove(array[
      case when old.status is distinct from new.status then 'status' end,
      case when old.cost is distinct from new.cost then 'amount' end,
      case when old.guest_count is distinct from new.guest_count
             or old.booking_number is distinct from new.booking_number then 'description' end,
      case when old.event_id is distinct from new.event_id then 'event_id' end
    ], null);
  end if;

  begin
    perform shg_finance_upsert_booking(new.id, v_fields);
  exception when others then
    raise warning 'Finanzas: no se pudo sincronizar la reserva % (%). Corré shg_finance_backfill_bookings() para repararla.',
      new.id, sqlerrm;
  end;
  return null;
end;
$$;

grant execute on function shg_finance_upsert_booking(uuid, text[]) to shg_service;
