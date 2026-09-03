-- reward_coin (zenit) was stored on every quest and shown throughout the UI,
-- but shg_rol_accept_quest() never actually paid it out — only
-- reward_standing (guild points) and reward_supplies (the leader's
-- allocation pool) moved. Splits reward_coin evenly across participants,
-- same moment reward_standing lands; any remainder from the split (integer
-- division) goes to the mission's leader, same "leader keeps the shared
-- spoils" role they already have over the supplies pool.

create or replace function shg_rol_accept_quest(p_quest_id uuid, p_admin_id uuid)
returns shg_rol_quest language plpgsql as $$
declare
  v_quest shg_rol_quest;
  v_guild_id uuid;
  v_participant record;
  v_new_points int;
  v_rank_id uuid;
  v_participant_count int;
  v_coin_share int;
  v_coin_remainder int;
begin
  select * into v_quest from shg_rol_quest where id = p_quest_id and status = 'turned_in' for update;
  if v_quest.id is null then
    raise exception 'Quest not found or not turned in';
  end if;

  select id into v_guild_id from shg_rol_guild limit 1;

  select count(*) into v_participant_count from shg_rol_quest_participant where quest_id = p_quest_id;
  if v_participant_count > 0 then
    v_coin_share := v_quest.reward_coin / v_participant_count;
    v_coin_remainder := v_quest.reward_coin - (v_coin_share * v_participant_count);
  else
    v_coin_share := 0;
    v_coin_remainder := 0;
  end if;

  for v_participant in
    select character_id from shg_rol_quest_participant where quest_id = p_quest_id
  loop
    -- zenit isn't a real column — it's a field inside the sheet_data jsonb
    -- blob (see fuCharacterSheetSchema), so it's updated via jsonb_set.
    update shg_rol_character
      set guild_points = guild_points + v_quest.reward_standing,
          sheet_data = jsonb_set(
            sheet_data,
            '{zenit}',
            to_jsonb(
              coalesce((sheet_data->>'zenit')::int, 0) + v_coin_share
                + (case when v_participant.character_id = v_quest.leader_character_id then v_coin_remainder else 0 end)
            )
          )
      where id = v_participant.character_id
      returning guild_points into v_new_points;

    select id into v_rank_id
      from shg_rol_guild_rank
      where guild_id = v_guild_id and points_threshold <= v_new_points
      order by points_threshold desc
      limit 1;

    update shg_rol_character set guild_rank_id = v_rank_id where id = v_participant.character_id;
  end loop;

  update shg_rol_quest
    set status = 'accepted', accepted_at = now(), accepted_by = p_admin_id,
        supplies_pool_remaining = v_quest.reward_supplies
    where id = p_quest_id
    returning * into v_quest;

  return v_quest;
end;
$$;

grant execute on function shg_rol_accept_quest(uuid, uuid) to shg_service;
