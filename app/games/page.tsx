import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { GameGrid } from "@/components/games/GameGrid";
import { GameSearchToolbar, GameTagSidebar } from "@/components/games/GameFilters";
import type { ShgGamePublic, GameComplexity } from "@/types/database";

export const metadata: Metadata = { title: "Ludoteca — Story Hunters Guild" };
export const dynamic = "force-dynamic";

// Explicit column list (not `select("*")`): this query's result is passed
// straight into GameGrid, a client component, so whatever's selected here
// gets serialized into the page for every visitor. `owner_ids` is admin-only
// and must never end up in that payload.
const PUBLIC_GAME_COLUMNS = "id, name, slug, min_players, max_players, playtime_minutes, complexity, beginner_friendly, tags, image_url, description, bgg_link, rules, status, created_at, updated_at";

export default async function GamesPage({
  searchParams,
}: {
  searchParams: { q?: string; complexity?: string; beginner?: string; tags?: string };
}) {
  const admin = createAdminClient();
  const selectedTags = searchParams.tags ? searchParams.tags.split(",").filter(Boolean) : [];

  let query = admin.from("shg_games").select(PUBLIC_GAME_COLUMNS).order("name");
  if (searchParams.q) query = query.ilike("name", `%${searchParams.q}%`);
  if (searchParams.complexity) query = query.eq("complexity", searchParams.complexity as GameComplexity);
  if (searchParams.beginner === "1") query = query.eq("beginner_friendly", true);
  if (selectedTags.length > 0) query = query.overlaps("tags", selectedTags);

  const [{ data }, { data: allGamesTags }] = await Promise.all([
    query,
    admin.from("shg_games").select("tags"),
  ]);
  const games = (data ?? []) as ShgGamePublic[];
  const allTags = Array.from(new Set((allGamesTags ?? []).flatMap((g) => g.tags as string[]))).sort();

  return (
    <main className="max-w-6xl 2xl:max-w-[1400px] mx-auto px-6 pb-14 lg:pb-10">
      {/* On lg the header is pinned under the nav (~59px) at a fixed 136px, so
          the sidebar and search toolbar below can stick at exactly 59+136=195px,
          i.e. where they already sit before scrolling, and never move. The
          clipped shadow paints the background full-width, so the glow of cards
          scrolling underneath doesn't peek out at the sides. */}
      <header className="pt-14 pb-8 lg:pt-0 lg:h-[136px] lg:flex lg:flex-col lg:justify-end lg:sticky lg:top-[59px] lg:z-30 bg-background lg:shadow-[0_0_0_100vmax_#3d3830] lg:[clip-path:inset(0_-100vmax)]">
        <h1 className="font-display text-3xl text-parchment text-center mb-2">Ludoteca</h1>
        <p className="font-body italic text-parchment-dark/70 text-center">
          Nuestra colección de {games.length} juegos, para todos los niveles.
        </p>
      </header>

      {/* min-h: at least as tall as the full-height sidebar, so a short result
          list doesn't make the sidebar shrink. overflow-y clip cuts off the
          sidebar's wrapper, which runs past the grid, without breaking sticky
          (unlike hidden); pb-4 (taken from main's pb) keeps the last row's
          glow inside the clip. See GameTagSidebar. */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-start lg:min-h-[calc(100vh-219px)] lg:[overflow-y:clip] lg:pb-4">
        <GameTagSidebar allTags={allTags} />

        <div className="min-w-0">
          <GameSearchToolbar />

          {games.length === 0 ? (
            <p className="font-body italic text-center text-parchment-dark py-16">
              No encontramos juegos con esos filtros.
            </p>
          ) : (
            <GameGrid games={games} />
          )}
        </div>
      </div>
    </main>
  );
}
