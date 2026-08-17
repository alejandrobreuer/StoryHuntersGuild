"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { CharacterSheet } from "@/components/rol/character/CharacterSheet";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { computeRank, nextRank } from "@/lib/rol/rank";
import type { FUCharacter } from "@/app/FU/lib/types";
import type { ShgRolGuildRank } from "@/types/database";
import { toast } from "sonner";

interface CharacterRow {
  id: string;
  name: string;
  sheet_data: FUCharacter;
  guild_points: number;
}

export default function RolCharacterPage() {
  const params = useParams<{ id: string }>();
  const [character, setCharacter] = React.useState<CharacterRow | null | undefined>(undefined);
  const [ranks, setRanks] = React.useState<ShgRolGuildRank[]>([]);

  const load = React.useCallback(async () => {
    const [charRes, guildRes] = await Promise.all([
      fetch(`/api/rol/characters/${params.id}`),
      fetch("/api/rol/guild"),
    ]);
    const charJson = await charRes.json();
    const guildJson = await guildRes.json();
    setCharacter(charRes.ok ? charJson.data : null);
    setRanks(guildJson.data?.ranks ?? []);
  }, [params.id]);

  React.useEffect(() => { load(); }, [load]);

  async function handleUpdate(updated: FUCharacter) {
    if (!character) return;
    setCharacter({ ...character, sheet_data: updated });
    const res = await fetch(`/api/rol/characters/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: updated.name || character.name, sheet_data: updated }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error ?? "No se pudo guardar.");
    }
  }

  if (character === undefined) return null;
  if (character === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-display text-2xl text-parchment">Personaje no encontrado.</p>
      </div>
    );
  }

  const currentRank = computeRank(character.guild_points, ranks);
  const upcoming = nextRank(character.guild_points, ranks);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-8 md:px-8">
        <div className="surface-parchment p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-label text-xs uppercase tracking-wide text-brass">{currentRank ? currentRank.name : "Sin rango"}</span>
            <span className="font-body text-xs text-ink-light">{character.guild_points} pts. de gremio</span>
          </div>
          {upcoming ? (
            <>
              <ProgressBar value={character.guild_points} max={upcoming.points_threshold} />
              <p className="font-body text-2xs text-ink-light mt-1">
                {upcoming.points_threshold - character.guild_points} puntos para {upcoming.name}
              </p>
            </>
          ) : (
            <p className="font-body text-2xs text-ink-light mt-1">Rango máximo alcanzado.</p>
          )}
        </div>
      </div>
      <CharacterSheet character={character.sheet_data} backHref="/rol/characters" onUpdate={handleUpdate} />
    </>
  );
}
