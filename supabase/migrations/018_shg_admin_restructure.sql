-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — admin restructure + event-mission approval
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 017_shg_mission_rework.sql.
--
-- 1. New "turn_ins" admin permission ("Aprobaciones de entregas"), for a
--    role that can approve/reject mission turn-ins without needing the
--    broader "quests" (mission CRUD) permission.
-- 2. Event missions move to per-turn-in admin approval: a new activation
--    status 'confirmed' marks a turn-in an admin has approved and that now
--    counts toward the mission's required_turn_ins threshold, distinct from
--    'turned_in' (self-reported, awaiting review) — the mission still only
--    rewards everyone in one batch once enough are 'confirmed'.

alter table shg_security_roles
  add column if not exists perm_turn_ins boolean not null default false;

alter table shg_quest_activations drop constraint if exists shg_quest_activations_status_check;
alter table shg_quest_activations
  add constraint shg_quest_activations_status_check
    check (status in ('active', 'turned_in', 'rejected', 'confirmed'));
