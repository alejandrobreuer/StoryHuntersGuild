-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Finanzas: ledger, categories, audit log
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 049_shg_game_drop_owner_id.sql. Spec: Reference/Docs/finanzas/SPEC.md.
--
-- The rules below live in triggers, not in the app, so they hold no matter
-- who writes (API, SQL editor, a future script):
--   1. Lock: a locked row can't change, except an update that only unlocks
--      it. Editing is unlock → edit → lock; the UI saves its changes and
--      is_locked = true in one update.
--   2. Rows whose source isn't 'manual' (reservations, later memberships)
--      are read-only here — only the sync (051) may write them, flagged with
--      the transaction-local setting app.finance_sync = 'on'.
--   3. updated_at / updated_by are set by trigger; every change is audited.
--   4. Delete = soft delete (deleted_at), only on unlocked manual rows. Hard
--      deletes are refused outright.
--   5. A row's category must be of the row's type.
--
-- Who is writing: SHG doesn't use Supabase Auth, and every request reaches
-- Postgres as the shg_service role (002), so the database can't tell which
-- admin is acting. The app says so through the transaction-local setting
-- app.finance_actor, set by shg_finance_save / shg_finance_delete below. A
-- manual write that doesn't carry it is rejected, so the audit log always
-- names someone.
--
-- Access: RLS enabled with zero public policies, grants only to shg_service
-- — same pattern as every other shg_ table. The admin check itself is the new
-- perm_finances permission, enforced by the API routes. No delete grant on
-- transactions: soft delete is an update.

-- ─── Types ───────────────────────────────────────────────────────────────────

do $$ begin
  create type shg_finance_tx_type as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type shg_finance_tx_status as enum ('confirmed', 'pending', 'cancelled');
exception when duplicate_object then null; end $$;

-- 'subscription' is reserved for the future memberships fee; nothing writes it yet.
do $$ begin
  create type shg_finance_tx_source as enum ('manual', 'booking', 'subscription');
exception when duplicate_object then null; end $$;

do $$ begin
  create type shg_finance_pay_method as enum ('transfer', 'mercado_pago', 'cash', 'card', 'other');
exception when duplicate_object then null; end $$;

-- ─── Booking number ──────────────────────────────────────────────────────────
-- Bookings had no short code; the ledger describes them as "Reserva #0158".
-- Existing bookings are numbered in the order they were made, new ones get
-- the next number automatically — the reservations flow doesn't change.

create sequence if not exists shg_bookings_number_seq;

alter table shg_bookings add column if not exists booking_number bigint;

-- Numbering isn't an edit to the booking, so don't bump updated_at.
alter table shg_bookings disable trigger trg_shg_bookings_updated_at;
update shg_bookings b set booking_number = n.num
from (select id, row_number() over (order by created_at, id) as num from shg_bookings) n
where b.id = n.id and b.booking_number is null;
alter table shg_bookings enable trigger trg_shg_bookings_updated_at;

select setval('shg_bookings_number_seq', greatest((select max(booking_number) from shg_bookings), 0) + 1, false);

alter table shg_bookings
  alter column booking_number set default nextval('shg_bookings_number_seq'),
  alter column booking_number set not null;
alter sequence shg_bookings_number_seq owned by shg_bookings.booking_number;

do $$ begin
  alter table shg_bookings add constraint shg_bookings_booking_number_key unique (booking_number);
exception when duplicate_object or duplicate_table then null; end $$;

grant usage on sequence shg_bookings_number_seq to shg_service;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists shg_finance_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  type        shg_finance_tx_type not null,          -- which rows may use it
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  is_system   boolean not null default false,        -- 'Reservas', 'Membresías': can't be deleted or deactivated
  -- How code finds a system category even after it's renamed:
  -- 'bookings' (Reservas), 'memberships' (Membresías).
  system_key  text unique,
  created_at  timestamptz not null default now(),
  unique (name, type)
);

create table if not exists shg_finance_transactions (
  id              uuid primary key default gen_random_uuid(),
  occurred_on     date not null,
  type            shg_finance_tx_type not null,
  description     text not null check (length(trim(description)) > 0),
  category_id     uuid not null references shg_finance_categories(id),
  event_id        uuid references shg_events(id) on delete set null,     -- null = "General"
  payment_method  shg_finance_pay_method not null default 'transfer',
  amount          numeric(12,2) not null,   -- always positive; the sign comes from type
  currency        char(3) not null default 'ARS',
  status          shg_finance_tx_status not null default 'confirmed',
  source          shg_finance_tx_source not null default 'manual',
  -- A deleted booking (its event was deleted) keeps its row, cancelled, for history.
  booking_id      uuid unique references shg_bookings(id) on delete set null,
  subscription_id uuid,                                                  -- future
  receipt_path    text,     -- path in the private shg-finance-receipts bucket (manual rows only)
  notes           text,
  is_locked       boolean not null default true,
  created_by      uuid references shg_admin_users(id) on delete set null,
  updated_by      uuid references shg_admin_users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,                                           -- soft delete
  -- A reservation can legitimately cost $0 (free event, 100% coupon) and
  -- still counts its seats, so only synced rows may be zero.
  constraint shg_finance_tx_amount_check check (amount > 0 or (source <> 'manual' and amount = 0))
);

create index if not exists shg_finance_tx_occurred_idx on shg_finance_transactions (occurred_on desc, created_at desc) where deleted_at is null;
create index if not exists shg_finance_tx_event_idx    on shg_finance_transactions (event_id)    where deleted_at is null;
create index if not exists shg_finance_tx_category_idx on shg_finance_transactions (category_id) where deleted_at is null;

create table if not exists shg_finance_audit_log (
  id              bigint generated always as identity primary key,
  transaction_id  uuid not null references shg_finance_transactions(id),
  action          text not null check (action in ('insert', 'update', 'lock', 'unlock', 'delete', 'sync')),
  changed_by      uuid,                 -- shg_admin_users.id; null = system sync
  changed_at      timestamptz not null default now(),
  before          jsonb,
  after           jsonb
);
create index if not exists shg_finance_audit_tx_idx on shg_finance_audit_log (transaction_id, changed_at);

-- ─── Seed categories ─────────────────────────────────────────────────────────

insert into shg_finance_categories (name, type, sort_order, is_system, system_key) values
  ('Reservas',       'income',  1, true,  'bookings'),
  ('Membresías',     'income',  2, true,  'memberships'),
  ('Otros ingresos', 'income',  3, false, null),
  ('Juegos',         'expense', 1, false, null),
  ('Impresión',      'expense', 2, false, null),
  ('Publicidad',     'expense', 3, false, null),
  ('Insumos',        'expense', 4, false, null),
  ('Transporte',     'expense', 5, false, null),
  ('Tecnología',     'expense', 6, false, null),
  ('Venue',          'expense', 7, false, null),
  ('Otros gastos',   'expense', 8, false, null)
on conflict (name, type) do nothing;

-- ─── Helpers ─────────────────────────────────────────────────────────────────

create or replace function shg_finance_is_sync()
returns boolean language sql stable as $$
  select coalesce(current_setting('app.finance_sync', true), '') = 'on';
$$;

create or replace function shg_finance_actor()
returns uuid language sql stable as $$
  select nullif(current_setting('app.finance_actor', true), '')::uuid;
$$;

-- ─── Transaction rules (BEFORE INSERT / UPDATE / DELETE) ─────────────────────

create or replace function shg_finance_tx_guard()
returns trigger language plpgsql as $$
declare
  v_sync  boolean := shg_finance_is_sync();
  v_actor uuid    := shg_finance_actor();
  v_cat_type shg_finance_tx_type;
  -- Columns the lock compares; bookkeeping columns may change on an unlock.
  v_ignore text[] := array['is_locked', 'updated_at', 'updated_by'];
  v_link_cols text[] := array['event_id', 'booking_id', 'created_by', 'updated_by', 'updated_at'];
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
       and (new.updated_by is null or new.updated_by = old.updated_by) then
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

drop trigger if exists trg_shg_finance_tx_guard on shg_finance_transactions;
create trigger trg_shg_finance_tx_guard
  before insert or update or delete on shg_finance_transactions
  for each row execute function shg_finance_tx_guard();

-- ─── Audit (AFTER INSERT / UPDATE) ───────────────────────────────────────────
-- security definer so the log can be written by the trigger while
-- shg_service itself only gets SELECT on it — the app can read the history
-- but can't forge or edit it.

create or replace function shg_finance_tx_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action text;
  v_ignore text[] := array['is_locked', 'updated_at', 'updated_by'];
begin
  -- Sync writes, and the cascades the guard lets through (marked by an empty
  -- updated_by — see shg_finance_tx_guard), are the system's doing.
  if shg_finance_is_sync() or (tg_op = 'UPDATE' and new.updated_by is null) then
    v_action := 'sync';
  elsif tg_op = 'INSERT' then
    v_action := 'insert';
  elsif new.deleted_at is not null and old.deleted_at is null then
    v_action := 'delete';
  elsif (to_jsonb(new) - v_ignore) = (to_jsonb(old) - v_ignore) then
    v_action := case when new.is_locked then 'lock' else 'unlock' end;
  else
    v_action := 'update';
  end if;

  insert into shg_finance_audit_log (transaction_id, action, changed_by, before, after)
  values (
    new.id, v_action,
    case when v_action = 'sync' then null else shg_finance_actor() end,
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new)
  );
  return null;
end;
$$;

drop trigger if exists trg_shg_finance_tx_audit on shg_finance_transactions;
create trigger trg_shg_finance_tx_audit
  after insert or update on shg_finance_transactions
  for each row execute function shg_finance_tx_audit();

-- ─── Category rules ──────────────────────────────────────────────────────────
-- System categories can be renamed and reordered, never deleted, deactivated
-- or retyped. No category can change type while rows use it (the rows would
-- stop matching). Deleting a category that rows use fails on the FK — the UI
-- offers to deactivate it instead.

create or replace function shg_finance_category_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'Las categorías del sistema no se pueden eliminar.';
    end if;
    return old;
  end if;

  if old.is_system then
    if not new.is_active then
      raise exception 'Las categorías del sistema no se pueden desactivar.';
    end if;
    if new.type <> old.type then
      raise exception 'Las categorías del sistema no pueden cambiar de tipo.';
    end if;
  end if;
  new.is_system  := old.is_system;
  new.system_key := old.system_key;

  if new.type <> old.type and exists (select 1 from shg_finance_transactions where category_id = old.id) then
    raise exception 'La categoría ya tiene movimientos: no puede cambiar de tipo.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_shg_finance_category_guard on shg_finance_categories;
create trigger trg_shg_finance_category_guard
  before update or delete on shg_finance_categories
  for each row execute function shg_finance_category_guard();

-- ─── Write RPCs used by the API ──────────────────────────────────────────────
-- Each sets app.finance_actor for its own transaction, then does a plain
-- insert/update — so every rule above still applies to it.
--
-- shg_finance_save(admin, id, fields):
--   id null  → insert a manual row from fields.
--   id given → update only the keys present in fields. Unlock = {is_locked:false};
--              save = {...changes, is_locked:true}.

create or replace function shg_finance_save(p_admin_id uuid, p_id uuid, p_fields jsonb)
returns shg_finance_transactions language plpgsql as $$
declare
  v_row shg_finance_transactions;
begin
  perform set_config('app.finance_actor', p_admin_id::text, true);

  if p_id is null then
    insert into shg_finance_transactions (
      occurred_on, type, description, category_id, event_id, payment_method,
      amount, status, receipt_path, notes, is_locked
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
      coalesce((p_fields->>'is_locked')::boolean, true)
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
      is_locked      = case when p_fields ? 'is_locked'      then (p_fields->>'is_locked')::boolean                    else t.is_locked end
    where t.id = p_id
    returning * into v_row;

    if v_row.id is null then
      raise exception 'Movimiento no encontrado.';
    end if;
  end if;

  return v_row;
end;
$$;

create or replace function shg_finance_delete(p_admin_id uuid, p_id uuid)
returns shg_finance_transactions language plpgsql as $$
declare
  v_row shg_finance_transactions;
begin
  perform set_config('app.finance_actor', p_admin_id::text, true);
  update shg_finance_transactions set deleted_at = now()
    where id = p_id and deleted_at is null
    returning * into v_row;
  if v_row.id is null then
    raise exception 'Movimiento no encontrado.';
  end if;
  return v_row;
end;
$$;

-- ─── Dashboard aggregation ───────────────────────────────────────────────────
-- One call returns everything the dashboard shows, computed from the same
-- rows the ledger lists (deleted excluded; cancelled excluded from totals),
-- so the two always agree.
--
-- Filters (all optional): p_from / p_to (inclusive dates), p_event_id, or
-- p_general = true for rows with no event, and p_category_id.

create or replace function shg_finance_summary(
  p_from        date    default null,
  p_to          date    default null,
  p_event_id    uuid    default null,
  p_general     boolean default false,
  p_category_id uuid    default null
)
returns jsonb language sql stable as $$
  with tx as (
    select t.*, b.guest_count, b.booking_number
    from shg_finance_transactions t
    left join shg_bookings b on b.id = t.booking_id
    where t.deleted_at is null
      and (p_from is null or t.occurred_on >= p_from)
      and (p_to   is null or t.occurred_on <= p_to)
      and (p_event_id is null or t.event_id = p_event_id)
      and (not p_general or t.event_id is null)
      and (p_category_id is null or t.category_id = p_category_id)
  ),
  confirmed as (select * from tx where status = 'confirmed'),
  totals as (
    select
      coalesce(sum(amount) filter (where type = 'income'), 0)  as income,
      coalesce(sum(amount) filter (where type = 'expense'), 0) as expense,
      coalesce(sum(guest_count) filter (where type = 'income' and source = 'booking'), 0) as seats,
      count(distinct event_id) filter (where type = 'income' and source = 'booking') as seat_events
    from confirmed
  ),
  pending as (
    select
      coalesce(sum(amount) filter (where type = 'income'), 0)  as receivable,
      coalesce(sum(amount) filter (where type = 'expense'), 0) as payable,
      count(*) filter (where type = 'income' and source = 'booking') as pending_bookings
    from tx where status = 'pending'
  ),
  by_category as (
    select c.id, c.name, sum(r.amount) as amount
    from confirmed r join shg_finance_categories c on c.id = r.category_id
    where r.type = 'expense'
    group by c.id, c.name
  ),
  bounds as (
    select
      date_trunc('month', coalesce(p_from, (select min(occurred_on) from tx), current_date))::date as first_month,
      date_trunc('month', coalesce(p_to, greatest(current_date, (select max(occurred_on) from tx))))::date as last_month
  ),
  months as (
    select m::date as month
    from bounds, generate_series(first_month, last_month, interval '1 month') m
  ),
  monthly as (
    select
      m.month,
      coalesce(sum(r.amount) filter (where r.type = 'income'), 0)  as income,
      coalesce(sum(r.amount) filter (where r.type = 'expense'), 0) as expense
    from months m
    left join confirmed r on date_trunc('month', r.occurred_on) = m.month
    group by m.month
  ),
  per_event as (
    select
      r.event_id,
      coalesce(sum(r.guest_count) filter (where r.type = 'income' and r.source = 'booking'), 0) as seats,
      coalesce(sum(r.amount) filter (where r.type = 'income'), 0)  as income,
      coalesce(sum(r.amount) filter (where r.type = 'expense'), 0) as expense
    from confirmed r
    group by r.event_id
  )
  select jsonb_build_object(
    'kpis', (
      select jsonb_build_object(
        'income', t.income,
        'expense', t.expense,
        'result', t.income - t.expense,
        'seats', t.seats,
        'seat_events', t.seat_events,
        'receivable', p.receivable,
        'payable', p.payable,
        'pending_bookings', p.pending_bookings
      )
      from totals t, pending p
    ),
    'monthly', coalesce((
      select jsonb_agg(jsonb_build_object('month', month, 'income', income, 'expense', expense) order by month)
      from monthly
    ), '[]'::jsonb),
    'by_category', coalesce((
      select jsonb_agg(jsonb_build_object('category_id', id, 'name', name, 'amount', amount) order by amount desc, name)
      from by_category
    ), '[]'::jsonb),
    'per_event', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_id', pe.event_id,
        'title', e.title,
        'starts_at', e.starts_at,
        'started_at', e.started_at,
        'ended_at', e.ended_at,
        'seats', pe.seats,
        'income', pe.income,
        'expense', pe.expense,
        'result', pe.income - pe.expense
      ) order by (pe.event_id is null), e.starts_at)
      from per_event pe left join shg_events e on e.id = pe.event_id
    ), '[]'::jsonb),
    'pending_bookings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'booking_id', r.booking_id,
        'booking_number', r.booking_number,
        'guest_count', r.guest_count,
        'amount', r.amount,
        'payment_method', r.payment_method,
        'event_title', e.title
      ) order by r.occurred_on, r.created_at)
      from tx r left join shg_events e on e.id = r.event_id
      where r.status = 'pending' and r.source = 'booking'
    ), '[]'::jsonb)
  );
$$;

-- ─── Receipts bucket ─────────────────────────────────────────────────────────
-- Private; read through short-lived signed URLs (same as shg-receipts).
-- Reservation receipts stay in shg-receipts — only manual rows use this one.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shg-finance-receipts', 'shg-finance-receipts', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

-- ─── Permission ──────────────────────────────────────────────────────────────
-- New Finanzas section, granted to the roles that can already manage roles
-- and admins (the top admins); give it to others from Configuración → Roles.

alter table shg_security_roles
  add column if not exists perm_finances boolean not null default false;

update shg_security_roles set perm_finances = true where perm_roles;

-- ─── Grants ──────────────────────────────────────────────────────────────────

alter table shg_finance_categories   enable row level security;
alter table shg_finance_transactions enable row level security;
alter table shg_finance_audit_log    enable row level security;

grant select, insert, update, delete on shg_finance_categories to shg_service;
grant select, insert, update         on shg_finance_transactions to shg_service;
grant select                         on shg_finance_audit_log to shg_service;

grant execute on function shg_finance_save(uuid, uuid, jsonb) to shg_service;
grant execute on function shg_finance_delete(uuid, uuid) to shg_service;
grant execute on function shg_finance_summary(date, date, uuid, boolean, uuid) to shg_service;
