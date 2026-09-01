"use client";

import * as React from "react";
import type { RollLogContext as RollLogCtx } from "./diceRoller";

const Context = React.createContext<RollLogCtx | undefined>(undefined);

/** Wraps the character sheet with the active quest (if any) so any rollDice/rollCheck/rollAttack call site can log itself without threading questId through every intermediate component. */
export function RollLogProvider({ value, children }: { value: RollLogCtx | undefined; children: React.ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRollLogContext(): RollLogCtx | undefined {
  return React.useContext(Context);
}
