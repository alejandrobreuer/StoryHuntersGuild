-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — game "Owner" (internal, admin-only)
-- ═══════════════════════════════════════════════════════════════════════════
-- Tracks who owns the physical copy of each game. Admin-only data — never
-- selected by any public-facing query (app/games, app/page.tsx,
-- app/events/[id]/page.tsx all list their own explicit public columns
-- instead of `select("*")` so this never leaks into a server-rendered
-- page's props). A plain lookup table + FK (not a shg_tags-style text[])
-- since a game has at most one owner.

create table if not exists shg_game_owners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

alter table shg_game_owners enable row level security;
-- No public policy — only ever read/written through the admin API.

grant select, insert, update, delete on shg_game_owners to shg_service;

alter table shg_games
  add column if not exists owner_id uuid references shg_game_owners(id) on delete set null;
