"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CharacterSheet } from "../../components/sheet/CharacterSheet";
import { LevelUpModal } from "../../components/sheet/LevelUpModal";
import { getCharacter, saveCharacter } from "../../lib/storage";
import type { FUCharacter } from "../../lib/types";

export default function CharacterPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [character, setCharacter] = useState<FUCharacter | null | undefined>(undefined);
  const [levelUpOpen, setLevelUpOpen] = useState(false);

  useEffect(() => {
    setCharacter(getCharacter(params.id) ?? null);
  }, [params.id]);

  if (character === undefined) return null;

  if (character === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="fu-heading text-xl text-[var(--fu-text)]">Character not found.</p>
        <button
          type="button"
          onClick={() => router.push("/FU")}
          className="fu-label mt-4 rounded-md bg-[var(--fu-gold)] px-4 py-2 text-xs font-bold text-[var(--fu-bg)]"
        >
          Back to Roster
        </button>
      </div>
    );
  }

  function handleApply(updated: FUCharacter) {
    saveCharacter(updated);
    setCharacter(updated);
    setLevelUpOpen(false);
  }

  return (
    <>
      <CharacterSheet character={character} onLevelUp={() => setLevelUpOpen(true)} />
      {levelUpOpen && (
        <LevelUpModal character={character} onApply={handleApply} onCancel={() => setLevelUpOpen(false)} />
      )}
    </>
  );
}
