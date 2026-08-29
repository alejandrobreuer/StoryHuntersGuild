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
 * canvas's own CSS + pixel dimensions to the viewport, then nudging the
 * engine with a synthetic resize event, fixes that on first render.
 */
function fillViewport(container: HTMLElement) {
  const canvas = container.querySelector("canvas");
  if (!canvas) return;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.dispatchEvent(new Event("resize"));
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
    })();
  }
  return diceBoxPromise;
}

/** Throws one or more dice groups (e.g. ["1d8", "1d10"]) in the full-screen overlay and resolves each group's own value (dice + any modifier baked into that notation), in the same order passed in — no toast, for callers that need to combine multiple rolled values (an attribute pair, an attack's accuracy+damage) before showing one result. */
async function throwDice(notations: string[]): Promise<number[]> {
  const box = await getDiceBox();
  box.clear();
  const groups = (await box.roll(notations.length === 1 ? notations[0] : notations)) as RollGroupResult[];
  return groups.map((g) => g.value ?? 0);
}

/** Rolls a single die/notation (e.g. "1d8", "2d6+4") and toasts its total. */
export async function rollDice(notation: string, label?: string): Promise<void> {
  try {
    const [total] = await throwDice([notation]);
    toast.success(label ? `${label}: ${total}` : `Resultado: ${total}`, { duration: 6000 });
  } catch {
    toast.error("No se pudo tirar el dado.");
  }
}

/** Fabula Ultima's core check: roll one die per attribute involved, keep the single highest result ("HR"), add a flat modifier — never sum the dice. Used for Magic Checks and any other bare attribute-pair check. */
export async function rollCheck(
  tokens: { label: string; die: number }[],
  modifier: number,
  resultLabel: string
): Promise<void> {
  try {
    const values = await throwDice(tokens.map((t) => `1d${t.die}`));
    const hr = Math.max(...values);
    const total = hr + modifier;
    const detail = tokens.map((t, i) => `${t.label} d${t.die} = ${values[i]}`).join("  ·  ");
    toast.success(`${resultLabel}: ${total}`, { description: detail, duration: 7000 });
  } catch {
    toast.error("No se pudo tirar el dado.");
  }
}

/** A weapon attack: the same two accuracy dice feed both the accuracy check (HR + accuracy modifier) and the damage (HR + weapon's damage bonus) in one physical roll — matching how a single Attack action resolves in Fabula Ultima. */
export async function rollAttack(args: {
  weaponName: string;
  accTokens: { label: string; die: number }[];
  accModifier: number;
  damageBonus: number;
  damageType: string;
}): Promise<void> {
  try {
    const values = await throwDice(args.accTokens.map((t) => `1d${t.die}`));
    const hr = Math.max(...values);
    const accuracyTotal = hr + args.accModifier;
    const damageTotal = hr + args.damageBonus;
    const detail = args.accTokens.map((t, i) => `${t.label} d${t.die} = ${values[i]}`).join("  ·  ");
    toast.success(args.weaponName, {
      description: `${detail}  —  Precisión: ${accuracyTotal}  ·  Daño: ${damageTotal}${args.damageType ? ` ${args.damageType}` : ""}`,
      duration: 8000,
    });
  } catch {
    toast.error("No se pudo tirar el ataque.");
  }
}
