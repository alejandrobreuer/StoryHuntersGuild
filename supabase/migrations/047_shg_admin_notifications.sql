-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — admin-panel notifications (bell + email)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 046_shg_password_reset.sql. In-app notifications for admin
-- accounts, shown in the bell in the admin sidebar and also sent by email
-- (see lib/notifications.ts). For now they're raised by the planner:
--   task_assigned — someone assigned you a task
--   task_comment  — someone commented on a task assigned to / created by you
--
-- recipient/actor point at shg_admin_users like every other planning FK
-- (see 044_shg_planning.sql). task_id cascades so deleting a task clears
-- its notifications instead of leaving dead links in the bell.
--
-- RLS enabled with zero public policies, grants only to shg_service — same
-- pattern as every other shg_ table.

create table if not exists shg_admin_notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references shg_admin_users(id) on delete cascade,
  actor_id      uuid references shg_admin_users(id) on delete set null,
  type          text not null check (type in ('task_assigned', 'task_comment')),
  title         text not null,
  body          text,
  link          text,
  task_id       uuid references shg_tasks(id) on delete cascade,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists shg_admin_notifications_recipient_idx
  on shg_admin_notifications (recipient_id, created_at desc);
create index if not exists shg_admin_notifications_unread_idx
  on shg_admin_notifications (recipient_id) where read_at is null;

alter table shg_admin_notifications enable row level security;
grant select, insert, update, delete on shg_admin_notifications to shg_service;
