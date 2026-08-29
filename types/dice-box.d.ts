// @3d-dice/dice-box ships no TypeScript declarations — this is a minimal
// ambient module covering only what app/FU/lib/diceRoller.ts actually calls.
declare module "@3d-dice/dice-box" {
  interface DiceBoxConfig {
    assetPath?: string;
    theme?: string;
    themeColor?: string;
    scale?: number;
    gravity?: number;
    [key: string]: unknown;
  }

  export default class DiceBox {
    constructor(selector: string, config?: DiceBoxConfig);
    init(): Promise<unknown>;
    roll(notation: string | string[]): Promise<unknown>;
    clear(): void;
    updateConfig(config: DiceBoxConfig): void;
  }
}
