-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Rol: mission history summary (Phase 5)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 030_shg_rol_quest_turn_in_accept_finish.sql. The DM writes a
-- short summary of what happened when they Finish a mission — participants,
-- rewards, and supply allocations are already derivable from existing
-- tables (shg_rol_quest_participant / shg_rol_quest_supply_allocation), this
-- is the one new piece of the "history record." No schema change needed for
-- gating /rol/history — it just checks whether the guild feature titled
-- "Tablón de Anuncios" is unlocked, the same way Guild Staff on /rol matches
-- a faction by name.

alter table shg_rol_quest add column if not exists history_summary text;

-- Same body as shg_rol_finish_quest in 030, plus an optional summary the DM
-- writes when finishing. A new parameter changes the signature, so this is a
-- separate overload as far as Postgres is concerned — drop the old two-arg
-- version first or calls with two args become ambiguous between the two.
drop function if exists shg_rol_finish_quest(uuid, uuid);

create or replace function shg_rol_finish_quest(p_quest_id uuid, p_admin_id uuid, p_summary text default null)
returns shg_rol_quest language plpgsql as $$
declare
  v_quest shg_rol_quest;
  v_guild_id uuid;
begin
  select * into v_quest from shg_rol_quest where id = p_quest_id and status = 'accepted' for update;
  if v_quest.id is null then
    raise exception 'Quest not found or not accepted';
  end if;

  select id into v_guild_id from shg_rol_guild limit 1;
  update shg_rol_guild set supplies = supplies + v_quest.supplies_pool_remaining where id = v_guild_id;

  update shg_rol_quest
    set status = 'completed', completed_at = now(), completed_by = p_admin_id, supplies_pool_remaining = 0,
        history_summary = nullif(trim(coalesce(p_summary, '')), '')
    where id = p_quest_id
    returning * into v_quest;

  return v_quest;
end;
$$;

grant execute on function shg_rol_finish_quest(uuid, uuid, text) to shg_service;
