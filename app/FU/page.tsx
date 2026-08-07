"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { classesById } from "./data/classes";
import { deleteCharacter, listCharacters } from "./lib/storage";
import type { FUCharacter } from "./lib/types";

export default function RosterPage() {
  const [characters, setCharacters] = useState<FUCharacter[] | null>(null);

  useEffect(() => {
    setCharacters(listCharacters());
  }, []);

  function handleDelete(c: FUCharacter) {
    if (!window.confirm(`Delete ${c.name || "this character"}? This can't be undone.`)) return;
    deleteCharacter(c.id);
    setCharacters(listCharacters());
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="fu-heading text-4xl font-extrabold text-[var(--fu-gold-glow-bright)]">Character Forge</h1>
          <p className="mt-2 text-base text-[var(--fu-text-onwood-muted)]">
            Level-5 Fabula Ultima player characters, built and kept here.
          </p>
        </div>
        <Link
          href="/FU/new"
          className="fu-label inline-flex items-center gap-2 rounded-md bg-[var(--fu-gold-glow)] px-5 py-2.5 text-sm font-bold text-[var(--fu-bg)] transition-opacity hover:opacity-90"
        >
          <Plus className="h-5 w-5" /> New Character
        </Link>
      </header>

      {characters !== null &&
        (characters.length === 0 ? (
          <div className="fu-panel mt-8 p-8 text-center">
            <p className="text-base text-[var(--fu-text-muted)]">No characters yet — start your first one.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {characters.map((c) => (
              <div key={c.id} className="fu-panel group relative p-5">
                <Link href={`/FU/character/${c.id}`} className="block">
                  <div className="fu-heading text-xl font-bold text-[var(--fu-text)]">{c.name || "Unnamed Hero"}</div>
                  <div className="line-clamp-1 text-sm text-[var(--fu-text-muted)]">{c.identity}</div>
                  <div className="fu-label mt-2 text-sm text-[var(--fu-gold)]">
                    LV {c.level} ·{" "}
                    {c.classLevels.map((cl) => `${classesById[cl.classId]?.name ?? cl.classId} (${cl.levels})`).join(" · ")}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(c)}
                  aria-label={`Delete ${c.name || "character"}`}
                  className="absolute right-4 top-4 text-[var(--fu-text-muted)] opacity-0 transition-opacity hover:text-[var(--fu-danger)] group-hover:opacity-100"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        ))}

      <p className="mt-10 text-sm text-[var(--fu-text-onwood-muted)]">
        Built for level-5 starting characters, advanced afterward via the sheet&apos;s Level Up
        flow. Higher-level (page 229) creation rules, Heroic Skills, rare/custom equipment
        creation and Bonds aren&apos;t covered here — check the rulebook for those.
      </p>
    </div>
  );
}
