-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Finanzas: Suscripciones (monthly recurring expenses)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 053_shg_mission_qr_codes.sql.
--
-- A subscription (Vercel, Supabase, a domain…) has a monthly amount and the
-- day of the month it's charged. shg_finance_run_recurring() writes one
-- ledger row per subscription per month once that day has come — dated on
-- the charge day (the last day of the month when it's shorter, e.g. 31 →
-- 30/09). Running it again never duplicates a month: rows are unique per
-- (recurring_id, recurring_period), and a generated row that was later
-- deleted stays deleted.
--
-- When it runs: every Finanzas page load calls it first (Movimientos,
-- Dashboard, Suscripciones), and once a day through pg_cron when that
-- extension is enabled (see the end of this file). Months it missed are
-- filled in on the next run — including past months when a subscription is
-- created with an earlier "Desde".
--
-- The generated rows are ordinary manual rows (source 'manual'): they can be
-- unlocked, corrected (e.g. the real ARS amount) and locked again like any
-- other, and the lock and audit rules from 050 apply. Only the generator may
-- set recurring_id / recurring_period, and nobody may change them after.
-- The 'subscription' source / subscription_id stay reserved for memberships.
--
-- Named "recurring" in the database to keep it apart from that reserved
-- memberships "subscription"; the UI calls them Suscripciones.

-- ─── Table ───────────────────────────────────────────────────────────────────

create table if not exists shg_finance_recurring (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(trim(name)) > 0),   -- "Vercel Pro"; the row reads "Vercel Pro — octubre 2026"
  category_id     uuid not null references shg_finance_categories(id),
  amount          numeric(12,2) not null check (amount > 0),     -- ARS, per month
  day_of_month    int not null check (day_of_month between 1 and 31),
  payment_method  shg_finance_pay_method not null default 'card',
  responsible_id  uuid references shg_admin_users(id) on delete set null,
  -- Pending = "check the real amount", confirmed = fixed amount, nothing to review.
  create_status   shg_finance_tx_status not null default 'pending'
                  check (create_status in ('pending', 'confirmed')),
  starts_on       date not null,      -- first charge on or after this date
  ends_on         date,               -- no charges after this date; null = no end
  is_active       boolean not null default true,
  created_by      uuid references shg_admin_users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint shg_finance_recurring_dates_check check (ends_on is null or ends_on >= starts_on)
);

-- ─── Link on the ledger ──────────────────────────────────────────────────────
-- No "on delete" action: a subscription with generated rows can't be deleted
-- (they'd lose where they came from) — pause it instead.

alter table shg_finance_transactions
  add column if not exists recurring_id     uuid references shg_finance_recurring(id),
  add column if not exists recurring_period date;   -- first day of the month it covers

do $$ begin
  alter table shg_finance_transactions
    add constraint shg_finance_tx_recurring_period_key unique (recurring_id, recurring_period);
exception when duplicate_object or duplicate_table then null; end $$;

alter table shg_finance_transactions drop constraint if exists shg_finance_tx_recurring_check;
alter table shg_finance_transactions
  add constraint shg_finance_tx_recurring_check
  check ((recurring_id is null) = (recurring_period is null) and (recurring_id is null or source = 'manual'));

-- ─── Subscription rules ──────────────────────────────────────────────────────
-- Expense categories only. Reactivating a paused subscription restarts it
-- from today, so the paused months aren't charged after the fact.

create or replace function shg_finance_recurring_guard()
returns trigger language plpgsql as $$
declare
  v_cat_type shg_finance_tx_type;
begin
  select type into v_cat_type from shg_finance_categories where id = new.category_id;
  if v_cat_type is distinct from 'expense' then
    raise exception 'Una suscripción tiene que usar una categoría de gastos.';
  end if;

  if tg_op = 'UPDATE' then
    if new.is_active and not old.is_active then
      new.starts_on := greatest(new.starts_on, (now() at time zone 'America/Argentina/Buenos_Aires')::date);
      if new.ends_on is not null and new.ends_on < new.starts_on then
        new.ends_on := null;
      end if;
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_shg_finance_recurring_guard on shg_finance_recurring;
create trigger trg_shg_finance_recurring_guard
  before insert or update on shg_finance_recurring
  for each row execute function shg_finance_recurring_guard();

-- ─── Ledger rule: only the generator links rows ──────────────────────────────
-- A trigger of its own, so 050/052's shg_finance_tx_guard stays as it is.

create or replace function shg_finance_tx_recurring_guard()
returns trigger language plpgsql as $$
begin
  if shg_finance_is_sync() then
    return new;
  end if;
  if tg_op = 'INSERT' and (new.recurring_id is not null or new.recurring_period is not null) then
    raise exception 'Los movimientos de suscripciones sólo los crea el sistema.';
  end if;
  if tg_op = 'UPDATE' and (new.recurring_id is distinct from old.recurring_id
                           or new.recurring_period is distinct from old.recurring_period) then
    raise exception 'Ese dato del movimiento no se puede cambiar.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_shg_finance_tx_recurring_guard on shg_finance_transactions;
create trigger trg_shg_finance_tx_recurring_guard
  before insert or update on shg_finance_transactions
  for each row execute function shg_finance_tx_recurring_guard();

-- ─── Generator ───────────────────────────────────────────────────────────────

create or replace function shg_finance_month_label(p date)
returns text language sql immutable as $$
  select (array['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                'septiembre', 'octubre', 'noviembre', 'diciembre'])[extract(month from p)::int]
         || ' ' || extract(year from p)::int;
$$;

-- p_today is for the tests; normally today in Buenos Aires. Returns how many
-- rows it created.
create or replace function shg_finance_run_recurring(p_today date default null)
returns int language plpgsql as $$
declare
  v_today date := coalesce(p_today, (now() at time zone 'America/Argentina/Buenos_Aires')::date);
  v_count int;
begin
  perform set_config('app.finance_sync', 'on', true);

  insert into shg_finance_transactions (
    occurred_on, type, description, category_id, payment_method, amount, status,
    responsible_id, is_locked, recurring_id, recurring_period
  )
  select
    m.charge_on, 'expense', r.name || ' — ' || shg_finance_month_label(m.period), r.category_id,
    r.payment_method, r.amount, r.create_status, r.responsible_id, true, r.id, m.period
  from shg_finance_recurring r
  cross join lateral (
    select p::date as period,
           p::date + (least(r.day_of_month,
                            extract(day from (p + interval '1 month - 1 day'))::int) - 1) as charge_on
    from generate_series(date_trunc('month', r.starts_on), date_trunc('month', v_today), interval '1 month') p
  ) m
  where r.is_active
    and m.charge_on >= r.starts_on
    and m.charge_on <= v_today
    and (r.ends_on is null or m.charge_on <= r.ends_on)
  order by m.charge_on, r.name
  on conflict (recurring_id, recurring_period) do nothing;

  get diagnostics v_count = row_count;
  perform set_config('app.finance_sync', '', true);
  return v_count;
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

alter table shg_finance_recurring enable row level security;
grant select, insert, update, delete on shg_finance_recurring to shg_service;
grant execute on function shg_finance_run_recurring(date) to shg_service;

-- ─── Daily run (optional) ────────────────────────────────────────────────────
-- Only if pg_cron is enabled (Supabase → Integrations → Cron). Without it the
-- rows still appear: the Finanzas pages run the generator when they load.
-- 09:00 UTC = 06:00 in Buenos Aires. Re-running this file just updates the job.

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('shg-finance-recurring', '0 9 * * *', 'select shg_finance_run_recurring()');
  end if;
end $$;
