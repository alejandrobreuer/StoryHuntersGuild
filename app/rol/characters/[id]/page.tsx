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
  portrait_url: string | null;
  full_body_url: string | null;
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

  // Always sends the character's FULL current state — sheet_data and both
  // image urls — regardless of which one actually changed, so a sheet edit
  // never silently wipes out the portrait/full-body images and vice versa.
  async function save(next: Partial<Pick<CharacterRow, "sheet_data" | "portrait_url" | "full_body_url">>) {
    if (!character) return;
    const merged = { ...character, ...next };
    setCharacter(merged);
    const res = await fetch(`/api/rol/characters/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: merged.sheet_data.name || merged.name,
        sheet_data: merged.sheet_data,
        portrait_url: merged.portrait_url,
        full_body_url: merged.full_body_url,
      }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error ?? "No se pudo guardar.");
    }
  }

  function handleUpdate(updated: FUCharacter) {
    save({ sheet_data: updated });
  }

  function handleImagesChange(portraitUrl: string | null, fullBodyUrl: string | null) {
    save({ portrait_url: portraitUrl, full_body_url: fullBodyUrl });
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

  const guildStanding = (
    <div className="mt-5 pt-4 border-t border-border">
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
  );

  return (
    <CharacterSheet
      character={character.sheet_data}
      portraitUrl={character.portrait_url}
      fullBodyUrl={character.full_body_url}
      backHref="/rol/characters"
      onUpdate={handleUpdate}
      onImagesChange={handleImagesChange}
      guildStanding={guildStanding}
    />
  );
}
