-- 063: bonus_rewards benefits say whether they boost XP, RP or both.
--
-- Before this, a bonus_rewards benefit boosted XP and RP alike. Every
-- existing one is set to XP (the only kind created so far).

alter table shg_benefits
  add column if not exists applies_to text check (applies_to in ('xp', 'rp', 'both'));

update shg_benefits set applies_to = 'xp' where kind = 'bonus_rewards' and applies_to is null;

alter table shg_benefits drop constraint if exists shg_benefits_kind_fields;
alter table shg_benefits add constraint shg_benefits_kind_fields check (
  case kind
    when 'event_discount'  then percent is not null
    when 'bonus_rewards'   then percent is not null and applies_to is not null
    when 'monthly_invites' then percent is not null and quantity is not null
    when 'monthly_2x1'     then quantity is not null
    when 'free_tickets'    then quantity is not null
    else true
  end
);
