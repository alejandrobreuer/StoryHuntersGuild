"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import {
  rollDice, getDiceScale, setDiceScale, DICE_SCALE_MIN, DICE_SCALE_MAX, DICE_SCALE_DEFAULT,
} from "@/app/FU/lib/diceRoller";

/**
 * Client-only, per-browser preference (localStorage, not the DB) — every
 * player who wants a different dice size adjusts their own here; there's no
 * single "correct" size to store per-guild.
 */
export function DiceSettingsManager() {
  // null until mounted, so the slider's initial value always matches what's
  // actually in localStorage rather than the server-rendered default.
  const [scale, setScale] = React.useState<number | null>(null);

  React.useEffect(() => { setScale(getDiceScale()); }, []);

  function handleChange(next: number) {
    setScale(next);
    setDiceScale(next);
  }

  return (
    <div className="max-w-md space-y-4">
      <div>
        <h2 className="font-display text-lg text-parchment mb-1">Tamaño de los dados</h2>
        <p className="text-sm text-parchment-dark font-body">
          Controla qué tan grandes se ven los dados 3D al tirar (en atributos, ataques y hechizos). Se guarda en este navegador.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={DICE_SCALE_MIN}
          max={DICE_SCALE_MAX}
          step={0.5}
          value={scale ?? DICE_SCALE_DEFAULT}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="flex-1 accent-brass"
        />
        <span className="font-label text-sm text-brass-bright w-10 text-right">{(scale ?? DICE_SCALE_DEFAULT).toFixed(1)}</span>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => rollDice("1d20", "Prueba")}>
          Tirar de prueba
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => handleChange(DICE_SCALE_DEFAULT)}>
          Restablecer
        </Button>
      </div>
    </div>
  );
}
