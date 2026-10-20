-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Finanzas: "Responsable" on each movement
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 051_shg_finance_booking_sync.sql.
--
-- Who on the team paid (gasto) or received (ingreso) the money. Any admin
-- user, not only those with perm_finances — a planning-only staff member
-- can still buy the snacks. Optional; manual rows only (a reservation's
-- money goes straight to the guild's account).
--
--   * shg_finance_save() defaults it to the acting admin on insert when the
--     caller doesn't send it.
--   * The lock covers it like any other column (the guard compares the
--     whole row), and changes are audited.
--   * Deleting that admin empties it (on delete set null): the guard below
--     lets that cascade through on a locked row, as it already did for
--     created_by / updated_by.

alter table shg_finance_transactions
  add column if not exists responsible_id uuid references shg_admin_users(id) on delete set null;

alter table shg_finance_transactions drop constraint if exists shg_finance_tx_responsible_check;
alter table shg_finance_transactions
  add constraint shg_finance_tx_responsible_check check (responsible_id is null or source = 'manual');

create index if not exists shg_finance_tx_responsible_idx on shg_finance_transactions (responsible_id);

-- ─── Guard: same as 050, plus responsible_id among the cascade links ─────────

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
      if old.source <> 'manual' then
        raise exception 'Sincronizado desde Reservas: se edita ahí.';
      end if;
      if old.deleted_at is not null then
        raise exception 'Este movimiento fue eliminado.';
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

-- ─── Save RPC: same as 050, plus responsible_id ──────────────────────────────

create or replace function shg_finance_save(p_admin_id uuid, p_id uuid, p_fields jsonb)
returns shg_finance_transactions language plpgsql as $$
declare
  v_row shg_finance_transactions;
begin
  perform set_config('app.finance_actor', p_admin_id::text, true);

  if p_id is null then
    insert into shg_finance_transactions (
      occurred_on, type, description, category_id, event_id, payment_method,
      amount, status, receipt_path, notes, is_locked, responsible_id
    ) values (
      (p_fields->>'occurred_on')::date,
      (p_fields->>'type')::shg_finance_tx_type,
      p_fields->>'description',
      (p_fields->>'category_id')::uuid,
      (p_fields->>'event_id')::uuid,
      coalesce((p_fields->>'payment_method')::shg_finance_pay_method, 'transfer'),
      (p_fields->>'amount')::numeric,
      coalesce((p_fields->>'status')::shg_finance_tx_status, 'confirmed'),
      p_fields->>'receipt_path',
      p_fields->>'notes',
      coalesce((p_fields->>'is_locked')::boolean, true),
      -- Not sent → whoever is saving it; sent as null → nobody.
      case when p_fields ? 'responsible_id' then (p_fields->>'responsible_id')::uuid else p_admin_id end
    )
    returning * into v_row;
  else
    update shg_finance_transactions t set
      occurred_on    = case when p_fields ? 'occurred_on'    then (p_fields->>'occurred_on')::date                     else t.occurred_on end,
      type           = case when p_fields ? 'type'           then (p_fields->>'type')::shg_finance_tx_type             else t.type end,
      description    = case when p_fields ? 'description'    then p_fields->>'description'                             else t.description end,
      category_id    = case when p_fields ? 'category_id'    then (p_fields->>'category_id')::uuid                     else t.category_id end,
      event_id       = case when p_fields ? 'event_id'       then (p_fields->>'event_id')::uuid                        else t.event_id end,
      payment_method = case when p_fields ? 'payment_method' then (p_fields->>'payment_method')::shg_finance_pay_method else t.payment_method end,
      amount         = case when p_fields ? 'amount'         then (p_fields->>'amount')::numeric                       else t.amount end,
      status         = case when p_fields ? 'status'         then (p_fields->>'status')::shg_finance_tx_status         else t.status end,
      receipt_path   = case when p_fields ? 'receipt_path'   then p_fields->>'receipt_path'                            else t.receipt_path end,
      notes          = case when p_fields ? 'notes'          then p_fields->>'notes'                                   else t.notes end,
      is_locked      = case when p_fields ? 'is_locked'      then (p_fields->>'is_locked')::boolean                    else t.is_locked end,
      responsible_id = case when p_fields ? 'responsible_id' then (p_fields->>'responsible_id')::uuid                    else t.responsible_id end
    where t.id = p_id
    returning * into v_row;

    if v_row.id is null then
      raise exception 'Movimiento no encontrado.';
    end if;
  end if;

  return v_row;
end;
$$;

grant execute on function shg_finance_save(uuid, uuid, jsonb) to shg_service;
