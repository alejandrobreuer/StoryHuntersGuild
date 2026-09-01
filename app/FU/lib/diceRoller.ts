"use client";

import { toast } from "sonner";

// A single die's result, and a "group" result (one per dice-notation string
// passed to roll() — group.value is the dice + modifier already summed).
// See https://fantasticdice.games/docs/usage/objects — no TS types are
// published, so this is transcribed from that doc rather than imported.
interface DieResult {
  groupId: number;
  rollId: number;
  sides: number;
  theme: string;
  themeColor: string;
  value: number;
}
interface RollGroupResult {
  id: number;
  mods: number[];
  qty: number;
  rolls: DieResult[];
  sides: number;
  theme: string;
  themeColor: string;
  value: number;
}
type DiceBoxCtor = typeof import("@3d-dice/dice-box").default;
type DiceBoxInstance = InstanceType<DiceBoxCtor>;

const OVERLAY_ID = "dice-roller-overlay";

// Per https://fantasticdice.games/docs/usage/config — "Options are best
// between 2-9. The higher the number the larger the dice."
export const DICE_SCALE_MIN = 2;
export const DICE_SCALE_MAX = 9;
export const DICE_SCALE_DEFAULT = 6;
const DICE_SCALE_STORAGE_KEY = "shg-dice-scale";

function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return DICE_SCALE_DEFAULT;
  return Math.min(DICE_SCALE_MAX, Math.max(DICE_SCALE_MIN, scale));
}

/** Reads the persisted dice size preference (per-browser, via localStorage) — falls back to the library default when unset or on a server render. */
export function getDiceScale(): number {
  if (typeof window === "undefined") return DICE_SCALE_DEFAULT;
  const raw = window.localStorage.getItem(DICE_SCALE_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return clampScale(parsed);
}

/** Persists the dice size preference and, if a dice box is already live in this tab, applies it immediately (no reload needed). */
export function setDiceScale(scale: number): void {
  const clamped = clampScale(scale);
  window.localStorage.setItem(DICE_SCALE_STORAGE_KEY, String(clamped));
  diceBoxPromise?.then((box) => box.updateConfig({ scale: clamped })).catch(() => {});
}

let diceBoxPromise: Promise<DiceBoxInstance> | null = null;

/**
 * The library sizes its WebGL canvas from the container's on-screen
 * dimensions at creation time, but a freshly-appended <canvas> defaults to
 * 300x150 until something explicitly resizes it — leaving the dice rendered
 * in a tiny box in the corner instead of filling the overlay. Forcing the
 * canvas's CSS size to the viewport, then nudging the engine with a
 * synthetic resize event, fixes that on first render.
 *
 * IMPORTANT: only touch the canvas's CSS (style.width/height), never its
 * width/height *attributes*. dice-box transfers the canvas to an
 * OffscreenCanvas in a worker (`transferControlToOffscreen()`), and once
 * that happens the spec forbids setting width/height on the main-thread
 * canvas element — it throws InvalidStateError, which previously rejected
 * the memoized dice-box promise here and broke every roll from then on,
 * regardless of the configured scale.
 */
function fillViewport(container: HTMLElement) {
  try {
    const canvas = container.querySelector("canvas");
    if (!canvas) return;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    window.dispatchEvent(new Event("resize"));
  } catch {
    // best-effort visual sizing — must never break dice rolling itself
  }
}

async function getDiceBox(): Promise<DiceBoxInstance> {
  if (!diceBoxPromise) {
    diceBoxPromise = (async () => {
      const { default: DiceBox } = await import("@3d-dice/dice-box");
      let container = document.getElementById(OVERLAY_ID);
      if (!container) {
        container = document.createElement("div");
        container.id = OVERLAY_ID;
        Object.assign(container.style, {
          position: "fixed",
          inset: "0",
          zIndex: "9999",
          pointerEvents: "none",
        } satisfies Partial<CSSStyleDeclaration>);
        document.body.appendChild(container);
      }
      const box = new DiceBox(`#${OVERLAY_ID}`, {
        assetPath: "/assets/dice-box/",
        theme: "default",
        scale: getDiceScale(),
        gravity: 1,
      });
      await box.init();
      fillViewport(container);
      window.addEventListener("resize", () => fillViewport(container as HTMLElement));
      return box;
    })().catch((err) => {
      // Don't leave a failed init memoized forever — otherwise one bad
      // attempt (a transient asset-load hiccup, etc.) breaks every roll for
      // the rest of the tab's session. Clear it so the next roll retries.
      diceBoxPromise = null;
      throw err;
    });
  }
  return diceBoxPromise;
}

// How long the dice stay fully visible after settling, and how long the
// fade-out itself takes, before clear()ing them off the table.
const DICE_VISIBLE_MS = 2500;
const DICE_FADE_MS = 700;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;

/** Where to log a Check's result — supplied by RollLogContext when the sheet has an active quest. */
export interface RollLogContext {
  questId: string;
}

/** Best-effort — a failed/slow history write must never block or error out the roll itself. */
async function logCheck(ctx: RollLogContext | undefined, label: string, result: string): Promise<void> {
  if (!ctx) return;
  try {
    await fetch(`/api/rol/quests/${ctx.questId}/checks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, result }),
    });
  } catch {
    // swallow — see doc comment
  }
}

/** Throws one or more dice groups (e.g. ["1d8", "1d10"]) in the full-screen overlay and resolves each group's own value (dice + any modifier baked into that notation), in the same order passed in — no toast, for callers that need to combine multiple rolled values (an attribute pair, an attack's accuracy+damage) before showing one result. */
async function throwDice(notations: string[]): Promise<number[]> {
  const box = await getDiceBox();
  const canvas = document.getElementById(OVERLAY_ID)?.querySelector("canvas");

  // Cancel any pending fade from a previous roll and snap the dice back to
  // fully visible instantly (no transition) before throwing new ones.
  if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
  if (canvas) {
    canvas.style.transition = "none";
    canvas.style.opacity = "1";
  }

  box.clear();
  const groups = (await box.roll(notations.length === 1 ? notations[0] : notations)) as RollGroupResult[];

  if (canvas) {
    fadeTimer = setTimeout(() => {
      canvas.style.transition = `opacity ${DICE_FADE_MS}ms ease`;
      canvas.style.opacity = "0";
      fadeTimer = null;
    }, DICE_VISIBLE_MS);
  }

  return groups.map((g) => g.value ?? 0);
}

/** Rolls a single die/notation (e.g. "1d8", "2d6+4") and toasts its total. */
export async function rollDice(notation: string, label?: string, logCtx?: RollLogContext): Promise<void> {
  try {
    const [total] = await throwDice([notation]);
    toast.success(label ? `${label}: ${total}` : `Resultado: ${total}`, { duration: 6000 });
    void logCheck(logCtx, label ?? notation, String(total));
  } catch (err) {
    console.error("[diceRoller] rollDice failed:", err);
    toast.error("No se pudo tirar el dado.", { description: err instanceof Error ? err.message : undefined });
  }
}

/** Fabula Ultima's core check: roll one die per attribute involved, keep the single highest result ("HR"), add a flat modifier — never sum the dice. Used for Magic Checks and any other bare attribute-pair check. */
export async function rollCheck(
  tokens: { label: string; die: number }[],
  modifier: number,
  resultLabel: string,
  logCtx?: RollLogContext
): Promise<void> {
  try {
    const values = await throwDice(tokens.map((t) => `1d${t.die}`));
    const hr = Math.max(...values);
    const total = hr + modifier;
    const detail = tokens.map((t, i) => `${t.label} d${t.die} = ${values[i]}`).join("  ·  ");
    toast.success(`${resultLabel}: ${total}`, { description: detail, duration: 7000 });
    void logCheck(logCtx, resultLabel, `${total} (${detail})`);
  } catch (err) {
    console.error("[diceRoller] rollCheck failed:", err);
    toast.error("No se pudo tirar el dado.", { description: err instanceof Error ? err.message : undefined });
  }
}

/** A weapon attack: the same two accuracy dice feed both the accuracy check (HR + accuracy modifier) and the damage (HR + weapon's damage bonus) in one physical roll — matching how a single Attack action resolves in Fabula Ultima. */
export async function rollAttack(args: {
  weaponName: string;
  accTokens: { label: string; die: number }[];
  accModifier: number;
  damageBonus: number;
  damageType: string;
  logCtx?: RollLogContext;
}): Promise<void> {
  try {
    const values = await throwDice(args.accTokens.map((t) => `1d${t.die}`));
    const hr = Math.max(...values);
    const accuracyTotal = hr + args.accModifier;
    const damageTotal = hr + args.damageBonus;
    const detail = args.accTokens.map((t, i) => `${t.label} d${t.die} = ${values[i]}`).join("  ·  ");
    const resultText = `Precisión: ${accuracyTotal} · Daño: ${damageTotal}${args.damageType ? ` ${args.damageType}` : ""}`;
    toast.success(args.weaponName, { description: `${detail}  —  ${resultText}`, duration: 8000 });
    void logCheck(args.logCtx, `Ataque — ${args.weaponName}`, resultText);
  } catch (err) {
    console.error("[diceRoller] rollAttack failed:", err);
    toast.error("No se pudo tirar el ataque.", { description: err instanceof Error ? err.message : undefined });
  }
}
