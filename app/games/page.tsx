import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { GameCard } from "@/components/games/GameCard";
import { GameFilters } from "@/components/games/GameFilters";
import type { ShgGame, GameComplexity } from "@/types/database";

export const metadata: Metadata = { title: "Ludoteca — Story Hunters Guild" };
export const dynamic = "force-dynamic";

export default async function GamesPage({
  searchParams,
}: {
  searchParams: { q?: string; complexity?: string; beginner?: string };
}) {
  const admin = createAdminClient();

  let query = admin.from("shg_games").select("*").order("name");
  if (searchParams.q) query = query.ilike("name", `%${searchParams.q}%`);
  if (searchParams.complexity) query = query.eq("complexity", searchParams.complexity as GameComplexity);
  if (searchParams.beginner === "1") query = query.eq("beginner_friendly", true);

  const { data } = await query;
  const games = (data ?? []) as ShgGame[];

  return (
    <main className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment text-center mb-2">Ludoteca</h1>
      <p className="font-body italic text-parchment-dark/70 text-center mb-8">
        Nuestra colección de juegos, para todos los niveles.
      </p>

      <GameFilters />

      {games.length === 0 ? (
        <p className="font-body italic text-center text-parchment-dark py-16">
          No encontramos juegos con esos filtros.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {games.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      )}
    </main>
  );
}
