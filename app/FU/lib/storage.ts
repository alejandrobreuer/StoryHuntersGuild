/**
 * localStorage persistence for characters. No backend for v1 — this is the
 * single source of truth for committed characters. Call only from client
 * components/event handlers/effects (guarded for SSR regardless).
 */
import type { FUCharacter } from "./types";

const STORAGE_KEY = "fu-characters-v1";

function readAll(): FUCharacter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(characters: FUCharacter[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

export function listCharacters(): FUCharacter[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCharacter(id: string): FUCharacter | undefined {
  return readAll().find((c) => c.id === id);
}

/** Upsert — inserts if `character.id` is new, otherwise replaces in place. */
export function saveCharacter(character: FUCharacter): void {
  const all = readAll();
  const index = all.findIndex((c) => c.id === character.id);
  if (index === -1) {
    all.push(character);
  } else {
    all[index] = character;
  }
  writeAll(all);
}

export function deleteCharacter(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

export function newCharacterId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `fu-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
