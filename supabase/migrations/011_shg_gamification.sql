-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — Progression, Quests, Ranks, Subscriptions, Event RP
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 010_shg_users_password.sql. Implements the systems described in
-- Reference/01-06 (vision, progression, quests, ranks, subscriptions, event
-- system). Every system is gated by a row in shg_feature_flags so it can be
-- hidden from public view without touching code if something needs fixing.

-- ─── Feature flags ───────────────────────────────────────────────────────────

create table if not exists shg_feature_flags (
  key         text primary key,
  label       text not null,
  description text,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now()
);

insert into shg_feature_flags (key, label, description) values
  ('progression',   'Progresión (Niveles y XP)', 'Muestra nivel y experiencia en el perfil.'),
  ('quests',        'Misiones',                  'Tablón de misiones público y misiones en el perfil.'),
  ('ranks',         'Rangos',                     'Muestra rango y puntos de rango en el perfil.'),
  ('subscriptions', 'Suscripciones',              'Muestra información de membresía/suscripción.'),
  ('event_rewards', 'Recompensas de eventos',     'Otorga y muestra Puntos de Rango por asistir a eventos.')
on conflict (key) do nothing;

alter table shg_feature_flags enable row level security;
grant select, insert, update, delete on shg_feature_flags to shg_service;

create or replace trigger trg_shg_feature_flags_updated_at
  before update on shg_feature_flags for each row execute function shg_set_updated_at();

-- ─── Users: progression, rank points, subscription status ──────────────────

alter table shg_users
  add column if not exists xp               int not null default 0,
  add column if not exists rp               int not null default 0,
  add column if not exists is_subscriber    boolean not null default false,
  add column if not exists subscriber_since timestamptz;

-- Level is derived from xp at read time (lib/gamification/progression.ts),
-- not stored — keeps the leveling curve retunable without a migration.

-- ─── Ranks ───────────────────────────────────────────────────────────────────

create table if not exists shg_ranks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  rp_required int  not null unique check (rp_required >= 0),
  benefit     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into shg_ranks (name, rp_required, benefit) values
  ('Cobre',      3,  'Reconocimiento como miembro pleno del gremio.'),
  ('Bronce',     6,  'Pequeño descuento en bebidas.'),
  ('Hierro',     12, 'Acceso a noches de juego solo para miembros.'),
  ('Acero',      20, 'Prioridad de reserva en eventos y pin de gremio.'),
  ('Plata',      32, 'Mayores descuentos en compras e insignia "Aventurero de Plata".'),
  ('Mithril',    52, 'Invitación a eventos exclusivos de alto nivel y token especial.'),
  ('Adamantina', 80, 'El máximo honor del gremio — estatus VIP permanente.')
on conflict (name) do nothing;

alter table shg_ranks enable row level security;
grant select, insert, update, delete on shg_ranks to shg_service;

create or replace trigger trg_shg_ranks_updated_at
  before update on shg_ranks for each row execute function shg_set_updated_at();

-- ─── Badges ──────────────────────────────────────────────────────────────────

create table if not exists shg_badges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  icon        text,   -- short emoji/label, no icon-library dependency needed
  created_at  timestamptz not null default now()
);

create table if not exists shg_user_badges (
  user_id    uuid not null references shg_users(id)  on delete cascade,
  badge_id   uuid not null references shg_badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table shg_badges      enable row level security;
alter table shg_user_badges enable row level security;
grant select, insert, update, delete on shg_badges, shg_user_badges to shg_service;

-- ─── Quests ──────────────────────────────────────────────────────────────────

create table if not exists shg_quests (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  narrative   text,
  type        text not null check (type in ('individual', 'party', 'community', 'event')),
  status      text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  reward_xp   int  not null default 0,
  reward_rp   int  not null default 0,
  badge_id    uuid references shg_badges(id) on delete set null,
  goal_count  int,                 -- community quests only: target total contributions
  starts_at   timestamptz,
  ends_at     timestamptz,
  event_id    uuid references shg_events(id) on delete set null,  -- event quests: tied to a specific event
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists shg_quests_type_status_idx on shg_quests (type, status);

-- A logged contribution — tracks progress only, no reward yet. For
-- individual/party/event quests this is just "did it, once"; for community
-- quests each row is one contribution toward the shared goal.
create table if not exists shg_quest_completions (
  id                  uuid primary key default gen_random_uuid(),
  quest_id            uuid not null references shg_quests(id) on delete cascade,
  user_id             uuid not null references shg_users(id)  on delete cascade,
  contribution_amount int  not null default 1 check (contribution_amount > 0),
  logged_by           uuid references shg_admin_users(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists shg_quest_completions_quest_idx on shg_quest_completions (quest_id);
create index if not exists shg_quest_completions_user_idx  on shg_quest_completions (user_id);

-- The actual XP/RP grant — at most once per (quest, user), which is what
-- lets a community quest's "all contributors get rewarded once the goal is
-- met" moment be a single explicit action instead of per-contribution logic.
create table if not exists shg_quest_rewards (
  quest_id   uuid not null references shg_quests(id) on delete cascade,
  user_id    uuid not null references shg_users(id)  on delete cascade,
  awarded_xp int  not null default 0,
  awarded_rp int  not null default 0,
  awarded_by uuid references shg_admin_users(id) on delete set null,
  awarded_at timestamptz not null default now(),
  primary key (quest_id, user_id)
);

alter table shg_quests             enable row level security;
alter table shg_quest_completions  enable row level security;
alter table shg_quest_rewards      enable row level security;
grant select, insert, update, delete on shg_quests, shg_quest_completions, shg_quest_rewards to shg_service;

create or replace trigger trg_shg_quests_updated_at
  before update on shg_quests for each row execute function shg_set_updated_at();

-- Atomic XP/RP grant, reusable for quests and event attendance alike.
-- Negative amounts reverse a prior award (e.g. undoing a mistaken grant, or
-- un-marking event attendance).
create or replace function shg_award_user(p_user_id uuid, p_xp int, p_rp int)
returns void language sql as $$
  update shg_users set xp = xp + p_xp, rp = rp + p_rp where id = p_user_id;
$$;
grant execute on function shg_award_user(uuid, int, int) to shg_service;

-- ─── Events: type + Rank Point reward ────────────────────────────────────────

alter table shg_events
  add column if not exists event_type text check (event_type in
    ('cooperative', 'competitive', 'tournament', 'release', 'guilds_choice')),
  add column if not exists reward_rp  int not null default 0;

-- ─── Bookings: record exactly how much RP each booking granted ─────────────
-- So un-marking attendance can reverse the exact amount even if the event's
-- reward_rp is edited later.

alter table shg_bookings
  add column if not exists rp_awarded int not null default 0;
