"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ShgRolCharacter } from "@/types/database";

const MAX_CHARACTERS = 2;

export default function MyCharactersPage() {
  const [characters, setCharacters] = React.useState<ShgRolCharacter[] | null>(null);

  React.useEffect(() => {
    fetch("/api/rol/characters")
      .then((r) => r.json())
      .then((json) => setCharacters(json.data ?? []));
  }, []);

  const atCap = (characters?.length ?? 0) >= MAX_CHARACTERS;

  return (
    <main className="max-w-4xl mx-auto px-6 py-14">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-parchment mb-1">Mis personajes</h1>
          <p className="font-body text-sm text-parchment-dark">
            Hasta {MAX_CHARACTERS} personajes por aventurero.
          </p>
        </div>
        {atCap ? (
          <p className="font-body text-xs italic text-parchment-dark max-w-xs text-right">
            Ya tenés el máximo de {MAX_CHARACTERS} personajes.
          </p>
        ) : (
          <Button asChild>
            <Link href="/rol/characters/new"><Plus size={14} className="mr-1 inline" />Nuevo personaje</Link>
          </Button>
        )}
      </header>

      {characters === null ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : characters.length === 0 ? (
        <div className="surface-parchment p-8 text-center">
          <p className="font-body text-ink-light">Todavía no creaste ningún personaje.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {characters.map((c) => {
            const sheet = c.sheet_data as { identity?: string; level?: number };
            return (
              <Link key={c.id} href={`/rol/characters/${c.id}`} className="surface-parchment p-5 block hover:shadow-parchment-lg transition-shadow">
                <p className="font-label text-lg font-bold text-ink">{c.name}</p>
                {sheet?.identity && <p className="font-body text-sm text-ink-light line-clamp-1">{sheet.identity}</p>}
                <p className="font-label text-2xs uppercase tracking-wide text-brass mt-2">
                  {c.guild_points} pts. de gremio
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
