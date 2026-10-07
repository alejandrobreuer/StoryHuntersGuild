-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Planning (epics, tasks, comments, templates)
-- ═══════════════════════════════════════════════════════════════════════════
-- Event-prep checklists for admins/staff. An epic is usually (not always)
-- linked to an event; it contains tasks that staff can create/edit/comment
-- on. Templates let an admin stamp out a pre-made task list with due dates
-- computed relative to the epic's own due date.
--
-- Identity: this app has no `profiles` table and no Supabase Auth — every
-- "owner"/"assignee"/"author" FK here points at shg_admin_users, exactly
-- like every other admin-attribution column in this schema (reviewed_by,
-- logged_by, awarded_by, ...), which are all nullable `on delete set null`
-- even where they read as "required" — kept consistent here rather than
-- deviating to `not null`.
--
-- RLS: this app never uses auth.uid()-scoped policies (no Supabase Auth to
-- back them). Every table below follows the established pattern instead —
-- RLS enabled with zero public policies, grants only to the scoped
-- shg_service role, authorization enforced entirely server-side via
-- lib/auth/guard.ts's requirePermission()/requireAdminPagePermission().
--
-- "Staff" vs "admin" is not a new identity concept — it falls out of the
-- two new perm_planning / perm_planning_admin columns on the existing
-- shg_security_roles table. A role with only perm_planning is the spec's
-- "staff"; both together is the spec's "admin" for this feature.

create table if not exists shg_epics (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  description text,
  status      text not null default 'planning'
                check (status in ('planning', 'in_progress', 'done', 'cancelled')),
  event_id    uuid references shg_events(id) on delete set null,
  owner_id    uuid references shg_admin_users(id) on delete set null,
  due_date    date,
  created_by  uuid references shg_admin_users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists shg_tasks (
  id           uuid primary key default gen_random_uuid(),
  epic_id      uuid not null references shg_epics(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 160),
  description  text,
  status       text not null default 'todo'
                 check (status in ('todo', 'in_progress', 'blocked', 'done')),
  assignee_id  uuid references shg_admin_users(id) on delete set null,
  due_date     date,
  -- Ordering is scoped to (epic_id, status) — each status column/group has
  -- its own 0-based sequence, not one counter shared across the whole epic.
  position     int not null default 0,
  completed_at timestamptz,
  created_by   uuid references shg_admin_users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Deferred (checked at COMMIT, not per-statement) so a reorder can write
  -- a whole column's new positions in one UPDATE without a transient
  -- duplicate ever being visible mid-statement.
  constraint shg_tasks_epic_status_position_uniq
    unique (epic_id, status, position) deferrable initially deferred
);

create table if not exists shg_task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references shg_tasks(id) on delete cascade,
  author_id  uuid references shg_admin_users(id) on delete set null,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shg_epic_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists shg_template_tasks (
  id               uuid primary key default gen_random_uuid(),
  template_id      uuid not null references shg_epic_templates(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 160),
  description      text,
  -- Days *before* the epic's due date; null = no due date for this task.
  due_offset_days  int check (due_offset_days between 0 and 365),
  position         int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists shg_epics_event_idx            on shg_epics (event_id);
create index if not exists shg_epics_owner_idx             on shg_epics (owner_id);
create index if not exists shg_epics_status_idx            on shg_epics (status);
create index if not exists shg_tasks_epic_idx              on shg_tasks (epic_id);
create index if not exists shg_tasks_assignee_idx          on shg_tasks (assignee_id);
create index if not exists shg_task_comments_task_idx      on shg_task_comments (task_id);
create index if not exists shg_template_tasks_template_idx on shg_template_tasks (template_id);

alter table shg_epics          enable row level security;
alter table shg_tasks          enable row level security;
alter table shg_task_comments  enable row level security;
alter table shg_epic_templates enable row level security;
alter table shg_template_tasks enable row level security;

grant select, insert, update, delete on shg_epics          to shg_service;
grant select, insert, update, delete on shg_tasks           to shg_service;
grant select, insert, update, delete on shg_task_comments    to shg_service;
grant select, insert, update, delete on shg_epic_templates   to shg_service;
grant select, insert, update, delete on shg_template_tasks   to shg_service;

create trigger trg_shg_epics_updated_at
  before update on shg_epics for each row execute function shg_set_updated_at();
create trigger trg_shg_tasks_updated_at
  before update on shg_tasks for each row execute function shg_set_updated_at();
create trigger trg_shg_task_comments_updated_at
  before update on shg_task_comments for each row execute function shg_set_updated_at();
create trigger trg_shg_epic_templates_updated_at
  before update on shg_epic_templates for each row execute function shg_set_updated_at();
create trigger trg_shg_template_tasks_updated_at
  before update on shg_template_tasks for each row execute function shg_set_updated_at();

-- Atomic reorder for one status column within one epic — the Supabase JS
-- client has no multi-row-transaction primitive of its own, and the
-- deferred unique constraint above only pays off if every row in a column
-- is rewritten as a single statement (so no two rows are ever asked to
-- hold the same (epic_id, status, position) at the same time within the
-- function's single implicit transaction).
create or replace function shg_planning_reorder_tasks(
  p_epic_id uuid, p_status text, p_ordered_ids uuid[]
) returns void language plpgsql as $$
begin
  -- completed_at: stamped the first time a task lands in 'done' (coalesce
  -- keeps an already-done task's original timestamp when it's just being
  -- reordered within the column), cleared unconditionally for every other
  -- status — correct for every other status too, since a non-done task
  -- always has completed_at already null, so clearing is a no-op there and
  -- only actually fires for the one task dragged out of 'done'.
  update shg_tasks
  set status = p_status,
      position = t.ord - 1,
      completed_at = case when p_status = 'done' then coalesce(completed_at, now()) else null end
  from unnest(p_ordered_ids) with ordinality as t(id, ord)
  where shg_tasks.id = t.id and shg_tasks.epic_id = p_epic_id;
end;
$$;

grant execute on function shg_planning_reorder_tasks(uuid, text, uuid[]) to shg_service;

-- Two new admin-panel permission flags, following the existing
-- shg_security_roles perm_* pattern exactly.
alter table shg_security_roles
  add column if not exists perm_planning       boolean not null default false,
  add column if not exists perm_planning_admin boolean not null default false;

-- Give every existing full-access role immediate access, same as how every
-- permission originally introduced in 013_shg_security_roles.sql was
-- onboarded — Planning should work for current admins right away, not
-- require a manual opt-in per role. Matched by "already has every other
-- permission", not by name — this project's seeded role names (e.g. "Guild
-- Master"/"Guild Staff" vs. the original migration 013 names "Dueño"/
-- "Administrador") have since diverged per-deployment, so a hardcoded name
-- match would silently match nothing on a renamed install.
update shg_security_roles
set perm_planning = true, perm_planning_admin = true
where perm_events and perm_venues and perm_games and perm_tags and perm_users
  and perm_quests and perm_ranks and perm_badges and perm_feature_flags
  and perm_bookings and perm_reports and perm_settings and perm_roles
  and perm_turn_ins and perm_rol;
