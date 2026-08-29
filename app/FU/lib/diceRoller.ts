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
let diceBoxPromise: Promise<DiceBoxInstance> | null = null;

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
        scale: 6,
        gravity: 1,
      });
      await box.init();
      return box;
    })();
  }
  return diceBoxPromise;
}

/**
 * Rolls the given dice notation (e.g. "1d8", "2d6+4") in a full-screen 3D
 * overlay, then toasts the total once the dice settle. Fully client-only —
 * only ever call this from an event handler, never during render.
 */
export async function rollDice(notation: string, label?: string): Promise<void> {
  try {
    const box = await getDiceBox();
    box.clear();
    const groups = (await box.roll(notation)) as RollGroupResult[];
    const total = groups.reduce((sum, g) => sum + (g.value ?? 0), 0);
    toast.success(label ? `${label}: ${total}` : `Resultado: ${total}`, { duration: 6000 });
  } catch {
    toast.error("No se pudo tirar el dado.");
  }
}
